import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { ticketService } from '../services/ticketService';
import { TicketStatus } from '../types';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { station, status, venueId } = req.query;
    const tickets = await ticketService.getTickets({
      stationSlug: station as string | undefined,
      status: status as TicketStatus | undefined,
      venueId: venueId as string | undefined,
    });
    res.json(tickets);
  } catch {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

router.get('/active', requireAuth, async (req: Request, res: Response) => {
  try {
    const { venueId } = req.query;
    const tickets = await ticketService.getActiveTickets(venueId as string | undefined);
    res.json(tickets);
  } catch {
    res.status(500).json({ error: 'Failed to fetch active tickets' });
  }
});

router.patch('/:id/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status: TicketStatus };

    const validStatuses: TicketStatus[] = ['new', 'preparing', 'ready', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const ticket = await ticketService.updateTicketStatus(id, status);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const io = req.app.get('io');
    io.emit('ticket:status_changed', { ticketId: id, status, updatedAt: ticket.updated_at });

    if (status === 'ready') {
      io.emit('notification:sound', { type: 'ready' });
    }

    res.json(ticket);
  } catch {
    res.status(500).json({ error: 'Failed to update ticket status' });
  }
});

export default router;
