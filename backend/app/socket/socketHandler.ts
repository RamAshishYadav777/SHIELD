import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';
import User from '../models/User';
import chatController from '../controllers/chatController';

// added user to socket type so typescript doesn't complain
interface CustomSocket extends Socket {
  user?: any;
  neighborhoodId?: string;
}

export const initSocket = (io: Server) => {
  // middleware to check jwt token before connection
  io.use(async (socket: CustomSocket, next) => {
    try {
      // check auth object or cookies for token
      let token = socket.handshake.auth?.token;
      
      if (!token && socket.handshake.headers.cookie) {
        const cookies = socket.handshake.headers.cookie.split(';').reduce((acc: any, curr) => {
          const [name, value] = curr.split('=').map(c => c.trim());
          acc[name] = value;
          return acc;
        }, {});
        token = cookies.accessToken || cookies.token;
      }
      
      if (!token) {
        return next(new Error('auth failed: no token found'));
      }

      const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
      const decoded = jwt.verify(token, secret as string) as any;
      
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return next(new Error('auth failed: user not in db'));
      }

      // store user in socket so we can use it in events
      socket.user = user;
      next();
    } catch (err) {
      logger.error('socket auth error:', err);
      next(new Error('auth failed: invalid token'));
    }
  });

  io.on('connection', (socket: CustomSocket) => {
    logger.info(`socket connected: ${socket.id} (user: ${socket.user?.name})`);

    // put user in their own private room
    socket.on('join', (userId: string) => {
      // using the id from client just for room name, but we could also use socket.user._id
      socket.join(userId);
      logger.info(`user ${userId} joined their private room`);
    });

    // when someone joins a neighborhood area
    socket.on('join-neighborhood', ({ lat, lng }: { lat: number, lng: number }) => {
      const neighborhoodId = `neighborhood-${lat.toFixed(1)}-${lng.toFixed(1)}`;
      socket.join(neighborhoodId);

      // keep track of which neighborhood they are in
      socket.neighborhoodId = neighborhoodId;

      const count = io.sockets.adapter.rooms.get(neighborhoodId)?.size || 0;
      io.to(neighborhoodId).emit('neighborhood-count-update', count);
      logger.info(`socket ${socket.id} joined ${neighborhoodId}. active: ${count}`);
    });

    // sending message to people nearby
    socket.on('send-neighborhood-message', async (data: any) => {
      const { content, lat, lng } = data;
      // get userId from auth, not from data to be safe
      const userId = socket.user?._id;
      
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

    // update location in db and notify others
    socket.on('update-location', async ({ coordinates }: { coordinates: number[] }) => {
      try {
        const userId = socket.user?._id;
        if (!userId) return;

        await User.findByIdAndUpdate(userId, {
          location: {
            type: 'Point',
            coordinates: coordinates,
            updatedAt: new Date()
          }
        });

        // let others in the room know where they are
        socket.to(`room-${userId}`).emit('location-received', {
          userId,
          coordinates,
          timestamp: Date.now()
        });
      } catch (err) {
        console.error('location update failed:', err);
      }
    });

    // broadcast sos to everyone
    socket.on('sos-triggered', async (data: any) => {
      socket.broadcast.emit('system-alert', {
        type: 'SOS',
        userName: socket.user?.name || data.userName, // use auth name if available
        coordinates: data.coordinates
      });
    });

    // cleanup on disconnect
    socket.on('disconnect', () => {
      const nId = socket.neighborhoodId;
      if (nId) {
        const count = io.sockets.adapter.rooms.get(nId)?.size || 0;
        io.to(nId).emit('neighborhood-count-update', count);
      }
      logger.info(`client disconnected: ${socket.id}`);
    });
  });
};
