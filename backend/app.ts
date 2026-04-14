import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import dotenv from 'dotenv';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import flash from 'connect-flash';
import { Server } from 'socket.io';
import { rateLimit } from 'express-rate-limit';

// imports
import logger from './app/utils/logger';
import dbConnect from './app/config/dbConnect';
import { initSocket } from './app/socket/socketHandler';

// routes
import authRoutes from './app/routes/authRoutes';
import sosRoutes from './app/routes/sosRoutes';
import incidentRoutes from './app/routes/incidentRoutes';
import userRoutes from './app/routes/userRoutes';
import safeZoneRoutes from './app/routes/safeZoneRoutes';
import flashRoutes from './app/routes/flashRoutes';
import notificationRoutes from './app/routes/notificationRoutes';
import chatRoutes from './app/routes/chatRoutes';
import paymentRoutes from './app/routes/paymentRoutes';
import adminRoutes from './app/routes/adminRoutes';

// config
dotenv.config();

const REQUIRED_ENV = ['JWT_SECRET', 'SESSION_SECRET'];
const missingEnv = REQUIRED_ENV.filter(key => !process.env[key]);
const dbUri = process.env.MONGODB_URI || process.env.MONGO_URI;

if ((missingEnv.length > 0 || !dbUri) && process.env.NODE_ENV === 'production') {
  const allMissing = !dbUri ? [...missingEnv, 'MONGODB_URI'] : missingEnv;
  console.error(`ERROR: Missing environment variables: ${allMissing.join(', ')}`);
  process.exit(1);
}

// db and app start
dbConnect();
const app = express();
const server = http.createServer(app);

// cors
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000', 
  'https://shield-gilt.vercel.app'
].filter(Boolean) as string[];

const io = new Server(server, {
  cors: { 
    origin: allowedOrigins.length > 0 ? allowedOrigins : "*", 
    methods: ["GET", "POST"], 
    credentials: true 
  }
});

app.set('io', io);
app.set('trust proxy', process.env.NODE_ENV === 'production');

// security
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  credentials: true
}));

const sanitize = (obj: any) => {
  if (obj && typeof obj === 'object') {
    Object.keys(obj).forEach(k => k.startsWith('$') ? delete obj[k] : sanitize(obj[k]));
  }
};

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use((req, res, next) => {
  [req.body, req.query, req.params].forEach(sanitize);
  next();
});

// logs
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', {
  stream: { write: (message) => logger.http(message.trim()) }
}));

// rate limit
const limiter = (max: number) => rateLimit({
  windowMs: 15 * 60 * 1000,
  max,
  message: { success: false, message: 'too many tries' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter(5000));
app.use(['/api/auth/', '/api/sos/'], limiter(2000));

// session
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24
  }
}));
app.use(flash());

// sockets
initSocket(io);

// routes
const routesMap: any = {
  auth: authRoutes, 
  sos: sosRoutes, 
  incidents: incidentRoutes, 
  users: userRoutes,
  safezones: safeZoneRoutes, 
  flash: flashRoutes, 
  notifications: notificationRoutes,
  chat: chatRoutes, 
  payments: paymentRoutes, 
  admin: adminRoutes
};

Object.keys(routesMap).forEach(p => app.use(`/api/${p}`, routesMap[p]));

// health check
app.get('/', (req, res) => res.json({ message: 'Welcome to SHIELD API' }));

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

// global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(err.stack);
  const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 15MB)' : 'Something went wrong';
  res.status(err.code === 'LIMIT_FILE_SIZE' ? 400 : 500).json({ success: false, message: msg });
});

// start server
const PORT = process.env.PORT || 5000;
const serverInstance = server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// stop server
const shutdown = (sig: string) => {
  logger.info(`${sig} - stopping server...`);
  serverInstance.close(() => mongoose.connection.close(false).then(() => process.exit(0)));
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
