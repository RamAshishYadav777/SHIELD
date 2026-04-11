import { Server, Socket } from 'socket.io';
import logger from '../utils/logger';
import User from '../models/User';
import chatController from '../controllers/chatController';

// add custom property to socket type
interface CustomSocket extends Socket {
  neighborhoodId?: string;
}

export const initSocket = (io: Server) => {
  io.on('connection', (socket: CustomSocket) => {
    logger.info(`New client connected: ${socket.id}`);

    // join private room
    socket.on('join', (userId: string) => {
      socket.join(userId);
      logger.info(`User ${userId} joined their private room`);
    });

    // neighborhood things
    socket.on('join-neighborhood', ({ lat, lng }: { lat: number, lng: number }) => {
      const neighborhoodId = `neighborhood-${lat.toFixed(1)}-${lng.toFixed(1)}`;
      socket.join(neighborhoodId);
      
      // using custom socket type to avoid errors
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

    // updating user location
    socket.on('update-location', async ({ userId, coordinates }: { userId: string, coordinates: number[] }) => {
      try {
        await User.findByIdAndUpdate(userId, {
          location: {
            type: 'Point',
            coordinates: coordinates,
            updatedAt: new Date()
          }
        });

        socket.to(`room-${userId}`).emit('location-received', {
          userId,
          coordinates,
          timestamp: Date.now()
        });
      } catch (err) {
        logger.error(`Location update error: ${err}`);
      }
    });

    // handle sos alert
    socket.on('sos-triggered', async (data: any) => {
      socket.broadcast.emit('system-alert', {
        type: 'SOS',
        userName: data.userName,
        coordinates: data.coordinates
      });
    });

    // when user leaves
    socket.on('disconnect', () => {
      const nId = socket.neighborhoodId;
      if (nId) {
        const count = io.sockets.adapter.rooms.get(nId)?.size || 0;
        io.to(nId).emit('neighborhood-count-update', count);
      }
      logger.info('Client disconnected');
    });
  });
};
