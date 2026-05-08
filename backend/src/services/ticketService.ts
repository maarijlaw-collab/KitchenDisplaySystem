import { supabase } from '../db/supabase';
import { squareService } from './squareService';
import { Ticket, TicketStatus } from '../types';

const DELAY_THRESHOLD_SECONDS = 15 * 60;

export const ticketService = {
  async createOrderFromSquare(squareOrder: any, locationId: string) {
    const { data: venue } = await supabase
      .from('venues')
      .select('id')
      .eq('square_location_id', locationId)
      .single();

    if (!venue) throw new Error(`No venue configured for Square location: ${locationId}`);

    const { data: stations } = await supabase
      .from('stations')
      .select('*')
      .eq('venue_id', venue.id);

    if (!stations?.length) throw new Error('No stations configured for this venue');

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        venue_id: venue.id,
        square_order_id: squareOrder.id,
        order_number: squareService.parseOrderNumber(squareOrder),
        customer_name: squareService.parseCustomerName(squareOrder),
        table_number: squareService.parseTableNumber(squareOrder),
        notes: squareOrder.note || null,
        source: 'square',
        total_amount: squareOrder.totalMoney?.amount || null,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    const parsedItems = squareService.parseItems(squareOrder);

    // Group items by station
    const itemsByStation: Record<string, typeof parsedItems> = {};
    parsedItems.forEach((item) => {
      if (!itemsByStation[item.stationSlug]) itemsByStation[item.stationSlug] = [];
      itemsByStation[item.stationSlug].push(item);
    });

    // Always ensure a pass ticket exists for final assembly
    if (Object.keys(itemsByStation).length > 0 && !itemsByStation['pass']) {
      itemsByStation['pass'] = parsedItems;
    } else if (Object.keys(itemsByStation).length === 0) {
      itemsByStation['pass'] = [];
    }

    const tickets: Ticket[] = [];

    for (const [stationSlug, items] of Object.entries(itemsByStation)) {
      const station = stations.find((s) => s.name === stationSlug)
        || stations.find((s) => s.name === 'pass');
      if (!station) continue;

      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert({ order_id: order.id, station_id: station.id, status: 'new' })
        .select()
        .single();

      if (ticketError) continue;

      if (items.length > 0) {
        await supabase.from('ticket_items').insert(
          items.map((item) => ({
            ticket_id: ticket.id,
            name: item.name,
            quantity: item.quantity,
            modifiers: item.modifiers,
            allergies: item.allergies,
            notes: item.notes || null,
          }))
        );
      }

      tickets.push({ ...ticket, items: items as any, order, station });
    }

    return { order, tickets };
  },

  async getTickets({ stationSlug, status, venueId }: {
    stationSlug?: string;
    status?: TicketStatus;
    venueId?: string;
  }) {
    let query = supabase
      .from('tickets')
      .select('*, items: ticket_items (*), order: orders (*), station: stations (*)')
      .order('created_at', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    } else {
      query = query.not('status', 'eq', 'completed');
    }

    if (stationSlug && stationSlug !== 'all') {
      const { data: station } = await supabase
        .from('stations')
        .select('id')
        .eq('name', stationSlug)
        .maybeSingle();
      if (station) query = query.eq('station_id', station.id);
    }

    if (venueId) {
      query = query.eq('order.venue_id', venueId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getActiveTickets(venueId?: string) {
    let query = supabase
      .from('tickets')
      .select('*, items: ticket_items (*), order: orders (*), station: stations (*)')
      .in('status', ['new', 'preparing', 'ready'])
      .order('created_at', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;

    if (venueId) {
      return data?.filter((t: any) => t.order?.venue_id === venueId) || [];
    }
    return data || [];
  },

  async updateTicketStatus(ticketId: string, status: TicketStatus) {
    const now = new Date().toISOString();
    const update: Record<string, any> = { status, updated_at: now };

    if (status === 'preparing') {
      update.started_at = now;
    }

    if (status === 'ready' || status === 'completed') {
      const { data: existing } = await supabase
        .from('tickets')
        .select('started_at, created_at, order_id, station_id')
        .eq('id', ticketId)
        .single();

      if (existing) {
        const startTime = existing.started_at
          ? new Date(existing.started_at)
          : new Date(existing.created_at);
        update.prep_duration_seconds = Math.floor((Date.now() - startTime.getTime()) / 1000);

        if (status === 'completed') {
          update.completed_at = now;
          const wasDelayed = update.prep_duration_seconds > DELAY_THRESHOLD_SECONDS;

          const { data: order } = await supabase
            .from('orders')
            .select('venue_id')
            .eq('id', existing.order_id)
            .single();

          await supabase.from('prep_analytics').insert({
            venue_id: order?.venue_id,
            station_id: existing.station_id,
            ticket_id: ticketId,
            prep_duration_seconds: update.prep_duration_seconds,
            was_delayed: wasDelayed,
          });
        }
      }
    }

    const { data, error } = await supabase
      .from('tickets')
      .update(update)
      .eq('id', ticketId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async completeOrderTickets(squareOrderId: string, io: any) {
    const { data: order } = await supabase
      .from('orders')
      .select('id')
      .eq('square_order_id', squareOrderId)
      .single();

    if (!order) return;

    const { data: tickets } = await supabase
      .from('tickets')
      .select('id')
      .eq('order_id', order.id)
      .not('status', 'eq', 'completed');

    for (const ticket of tickets || []) {
      const updated = await this.updateTicketStatus(ticket.id, 'completed');
      io.emit('ticket:status_changed', {
        ticketId: ticket.id,
        status: 'completed',
        updatedAt: updated.updated_at,
      });
    }
  },

  async syncOrderFromSquare(squareOrder: any) {
    await supabase
      .from('orders')
      .update({ notes: squareOrder.note || null, updated_at: new Date().toISOString() })
      .eq('square_order_id', squareOrder.id);
  },

  startDelayMonitor(io: any) {
    setInterval(async () => {
      const threshold = new Date(Date.now() - DELAY_THRESHOLD_SECONDS * 1000).toISOString();

      const { data: delayed } = await supabase
        .from('tickets')
        .select('id, created_at, order: orders (order_number)')
        .in('status', ['new', 'preparing'])
        .lt('created_at', threshold);

      (delayed || []).forEach((ticket: any) => {
        const elapsed = Math.floor((Date.now() - new Date(ticket.created_at).getTime()) / 1000);
        io.emit('ticket:delayed', {
          ticketId: ticket.id,
          elapsedSeconds: elapsed,
          orderNumber: ticket.order?.order_number,
        });
        io.emit('notification:sound', { type: 'delayed' });
      });
    }, 60_000);
  },
};
