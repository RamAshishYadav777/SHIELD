import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
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

const app = express();
const server = http.createServer(app);
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
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
app.set('trust proxy', true); // For production behind Nginx/Vercel/Render
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
// app.use(mongoSanitize());

// HTTP Request logging
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', {
  stream: { write: (message) => logger.http(message.trim()) }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased for development flexibility
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  }
});
app.use('/api/', limiter);

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

app.use('/api/auth', authRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/safezones', safeZoneRoutes);
app.use('/api/flash', flashRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/payments', paymentRoutes);

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
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});
