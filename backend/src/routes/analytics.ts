import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { supabase } from '../db/supabase';

const router = Router();

router.get('/summary', requireAuth, async (req: Request, res: Response) => {
  try {
    const { venueId, from, to } = req.query;

    let query = supabase
      .from('prep_analytics')
      .select('*, station: stations (name, display_name)')
      .order('created_at', { ascending: false });

    if (venueId) query = query.eq('venue_id', venueId);
    if (from) query = query.gte('created_at', from as string);
    if (to) query = query.lte('created_at', to as string);

    const { data, error } = await query;
    if (error) throw error;

    const totalTickets = data.length;
    const avgPrepTime = totalTickets > 0
      ? Math.round(data.reduce((sum, r) => sum + (r.prep_duration_seconds || 0), 0) / totalTickets)
      : 0;
    const delayedCount = data.filter((r) => r.was_delayed).length;

    const byStation: Record<string, { count: number; avgSeconds: number; delayed: number }> = {};
    data.forEach((r) => {
      const key = r.station?.name || 'unknown';
      if (!byStation[key]) byStation[key] = { count: 0, avgSeconds: 0, delayed: 0 };
      byStation[key].count++;
      byStation[key].avgSeconds += r.prep_duration_seconds || 0;
      if (r.was_delayed) byStation[key].delayed++;
    });
    Object.values(byStation).forEach((s) => {
      s.avgSeconds = s.count > 0 ? Math.round(s.avgSeconds / s.count) : 0;
    });

    res.json({ totalTickets, avgPrepTime, delayedCount, byStation });
  } catch {
    res.status(500).json({ error: 'Failed to fetch analytics summary' });
  }
});

router.get('/peak-hours', requireAuth, async (req: Request, res: Response) => {
  try {
    const { venueId } = req.query;

    let query = supabase.from('prep_analytics').select('created_at');
    if (venueId) query = query.eq('venue_id', venueId);

    const { data, error } = await query;
    if (error) throw error;

    const hourCounts: Record<number, number> = {};
    for (let h = 0; h < 24; h++) hourCounts[h] = 0;
    data.forEach((r) => {
      hourCounts[new Date(r.created_at).getHours()]++;
    });

    res.json(hourCounts);
  } catch {
    res.status(500).json({ error: 'Failed to fetch peak hours' });
  }
});

export default router;
