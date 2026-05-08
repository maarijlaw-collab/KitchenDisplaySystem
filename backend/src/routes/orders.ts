import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { supabase } from '../db/supabase';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { venueId, limit = '50' } = req.query;

    let query = supabase
      .from('orders')
      .select(`
        *,
        tickets (
          *,
          items: ticket_items (*),
          station: stations (*)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit as string));

    if (venueId) query = query.eq('venue_id', venueId);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        tickets (
          *,
          items: ticket_items (*),
          station: stations (*)
        )
      `)
      .eq('id', req.params.id)
      .single();

    if (error) return res.status(404).json({ error: 'Order not found' });
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

export default router;
