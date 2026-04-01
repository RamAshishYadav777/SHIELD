import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
// import mongoSanitize from 'express-mongo-sanitize'; // Removed due to Express 5 compatibility issues
import { rateLimit } from 'express-rate-limit';
import session from 'express-session';
import flash from 'connect-flash';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import logger from './utils/logger';
import dbConnect from './config/dbConnect';


// Load environment variables
dotenv.config();

// Production Safety Check: Ensure critical security keys are present
const REQUIRED_ENV = ['JWT_SECRET', 'SESSION_SECRET'];
const missingEnv = REQUIRED_ENV.filter(key => !process.env[key]);

// Explicit check for MongoDB URI (can be either MONGODB_URI or MONGO_URI)
const dbUri = process.env.MONGODB_URI || process.env.MONGO_URI;

if ((missingEnv.length > 0 || !dbUri) && process.env.NODE_ENV === 'production') {
  const allMissing = !dbUri ? [...missingEnv, 'MONGODB_URI'] : missingEnv;
  console.error(`ERROR: Missing critical environment variables: ${allMissing.join(', ')}`);
  process.exit(1);
}

const app = express();
const server = http.createServer(app);
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'https://shield-gilt.vercel.app',
  'https://shield-frontend.vercel.app'
].filter(Boolean) as string[];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins.length > 0 ? allowedOrigins : "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// App-wide access to socket instance
app.set('io', io);

// Middleware
app.set('trust proxy', process.env.NODE_ENV === 'production'); // For production behind Nginx/Vercel/Render
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  credentials: true
}));
app.use(compression()); // Compress responses
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// Basic Sanitization to prevent MongoDB Operator Injection
const sanitizeObject = (obj: any) => {
  if (obj && typeof obj === 'object') {
    for (const key in obj) {
      if (key.startsWith('$')) {
        delete obj[key];
      } else {
        sanitizeObject(obj[key]);
      }
    }
  }
};
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);
  next();
});

// HTTP Request logging
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', {
  stream: { write: (message) => logger.http(message.trim()) }
}));

// Rate limiting - Tiered Strategy
const defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // 100 requests per 15 minutes for general API
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes' }
});

const criticalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // Less strict to allow normal React Query refetch loops
  message: { success: false, message: 'High-frequency critical request detected. Cooling down.' }
});

app.use('/api/', defaultLimiter);
app.use('/api/auth/', criticalLimiter);
app.use('/api/sos/', criticalLimiter);

// Session and Flash
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));
app.use(flash());

// Database connection
dbConnect();

// Models and Controllers (imported for Socket.io)
import User from './models/User';
import chatController from './controllers/chatController';

// Socket.io connection
io.on('connection', (socket) => {
  logger.info(`New client connected: ${socket.id}`);

  socket.on('join', (userId: string) => {
    socket.join(userId);
    logger.info(`User ${userId} joined their private room`);
  });

  socket.on('join-neighborhood', ({ lat, lng }: { lat: number, lng: number }) => {
    // Shard by 1 decimal point (~111km area roughly at equator, but depends on lat)
    const neighborhoodId = `neighborhood-${lat.toFixed(1)}-${lng.toFixed(1)}`;
    socket.join(neighborhoodId);
    // @ts-ignore
    socket.neighborhoodId = neighborhoodId;

    const count = io.sockets.adapter.rooms.get(neighborhoodId)?.size || 0;
    io.to(neighborhoodId).emit('neighborhood-count-update', count);
    logger.info(`Socket ${socket.id} joined ${neighborhoodId}. Total: ${count}`);
  });

  socket.on('send-neighborhood-message', async (data: any) => {
    const { userId, content, lat, lng } = data;
    const neighborhoodId = `neighborhood-${lat.toFixed(1)}-${lng.toFixed(1)}`;

    const savedMsg = await chatController.saveMessage({
      user: userId,
      content,
      neighborhoodId,
      location: { type: 'Point', coordinates: [lng, lat] }
    });

    if (savedMsg) {
      io.to(neighborhoodId).emit('neighborhood-message-received', savedMsg);
    }
  });

  socket.on('update-location', async ({ userId, coordinates }: { userId: string, coordinates: number[] }) => {
    try {
      // Update location in DB
      await User.findByIdAndUpdate(userId, {
        location: {
          type: 'Point',
          coordinates: coordinates, // [long, lat]
          updatedAt: new Date()
        }
      });

      // Emit to trusted peers who are following this user
      socket.to(`room-${userId}`).emit('location-received', {
        userId,
        coordinates,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error('Location update error:', err);
    }
  });

  socket.on('sos-triggered', async (data: any) => {
    socket.broadcast.emit('system-alert', {
      type: 'SOS',
      user: data.userName,
      location: data.coordinates
    });
  });

  socket.on('disconnect', () => {
    // @ts-ignore
    const nId = socket.neighborhoodId;
    if (nId) {
      const count = io.sockets.adapter.rooms.get(nId)?.size || 0;
      io.to(nId).emit('neighborhood-count-update', count);
    }
    logger.info('Client disconnected');
  });
});

// Routes
import authRoutes from './routes/authRoutes';
import sosRoutes from './routes/sosRoutes';
import incidentRoutes from './routes/incidentRoutes';
import userRoutes from './routes/userRoutes';
import safeZoneRoutes from './routes/safeZoneRoutes';
import flashRoutes from './routes/flashRoutes';
import notificationRoutes from './routes/notificationRoutes';
import chatRoutes from './routes/chatRoutes';
import paymentRoutes from './routes/paymentRoutes';
import adminRoutes from './routes/adminRoutes';

app.use('/api/auth', authRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/safezones', safeZoneRoutes);
app.use('/api/flash', flashRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Default Route
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to SHIELD API' });
});

// Health Check for monitoring
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

app.get('/api/status', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(err.stack);

  // Handle Multer file size errors specifically
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File is too large! Maximum allowed size is 15MB.'
    });
  }

  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

const PORT = process.env.PORT || 5000;
const serverInstance = server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

// Graceful Shutdown Handler
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  serverInstance.close(() => {
    logger.info('HTTP server closed.');
    mongoose.connection.close(false).then(() => {
      logger.info('MongoDB connection closed.');
      process.exit(0);
    });
  });

  // Force shutdown after 10s if graceful fails
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
