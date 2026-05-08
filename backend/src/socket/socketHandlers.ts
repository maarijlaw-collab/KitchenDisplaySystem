import { Server, Socket } from 'socket.io';
import { ticketService } from '../services/ticketService';
import { TicketStatus } from '../types';

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    socket.on('station:join', ({ stationId }: { stationId: string }) => {
      // Leave all station rooms before joining new one
      for (const room of socket.rooms) {
        if (room.startsWith('station:')) socket.leave(room);
      }
      socket.join(`station:${stationId}`);
    });

    socket.on('ticket:update_status', async ({ ticketId, status }: { ticketId: string; status: string }) => {
      const validStatuses: TicketStatus[] = ['new', 'preparing', 'ready', 'completed'];
      if (!validStatuses.includes(status as TicketStatus)) {
        socket.emit('error', { message: 'Invalid status' });
        return;
      }

      try {
        const ticket = await ticketService.updateTicketStatus(ticketId, status as TicketStatus);

        io.emit('ticket:status_changed', {
          ticketId,
          status,
          updatedAt: ticket.updated_at,
        });

        if (status === 'ready') {
          io.emit('notification:sound', { type: 'ready' });
        }
      } catch (err) {
        console.error('[Socket] Status update failed:', err);
        socket.emit('error', { message: 'Failed to update ticket' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
    });
  });

  ticketService.startDelayMonitor(io);
}
