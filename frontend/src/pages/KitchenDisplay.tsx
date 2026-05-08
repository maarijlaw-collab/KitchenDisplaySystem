import { useEffect } from 'react';
import { Header } from '../components/layout/Header';
import { StationFilter } from '../components/layout/StationFilter';
import { TicketGrid } from '../components/tickets/TicketGrid';
import { useTicketStore } from '../stores/ticketStore';
import { useSocket } from '../hooks/useSocket';
import { supabase } from '../lib/supabase';
import { Ticket } from '../types';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string) || 'http://localhost:3001';
const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === 'true';

const now = () => new Date().toISOString();
const minsAgo = (m: number) => new Date(Date.now() - m * 60 * 1000).toISOString();

const MOCK_TICKETS: Ticket[] = [
  {
    id: '1', order_id: 'o1', station_id: 's1', status: 'new',
    created_at: minsAgo(2), updated_at: now(),
    order: {
      id: 'o1', venue_id: 'v1', square_order_id: 'sq1', order_number: 'A42',
      customer_name: 'James', table_number: '7', notes: null,
      source: 'square', total_amount: 2800, created_at: minsAgo(2), updated_at: now(),
    },
    station: { id: 's1', venue_id: 'v1', name: 'coffee', display_name: 'Coffee Bar' },
    items: [
      {
        id: 'i1', ticket_id: '1', name: 'Flat White', quantity: 2,
        modifiers: [{ name: 'Oat Milk', type: 'dietary' }], allergies: [],
      },
      {
        id: 'i2', ticket_id: '1', name: 'Chai Latte', quantity: 1,
        modifiers: [{ name: 'Extra Shot', type: 'preference' }], allergies: [],
        notes: 'Hot, not warm',
      },
    ],
  },
  {
    id: '2', order_id: 'o2', station_id: 's2', status: 'preparing',
    started_at: minsAgo(4), created_at: minsAgo(6), updated_at: now(),
    order: {
      id: 'o2', venue_id: 'v1', square_order_id: 'sq2', order_number: 'B17',
      customer_name: 'Sarah M.', table_number: '3',
      notes: 'Birthday table — add candle please',
      source: 'square', total_amount: 4500, created_at: minsAgo(6), updated_at: now(),
    },
    station: { id: 's2', venue_id: 'v1', name: 'grill', display_name: 'Grill Station' },
    items: [
      {
        id: 'i3', ticket_id: '2', name: 'Wagyu Burger', quantity: 1,
        modifiers: [
          { name: 'Gluten Free Bun', type: 'dietary' },
          { name: 'No Onion', type: 'preference' },
          { name: 'Nut Allergy', type: 'allergy' },
        ],
        allergies: ['Nut Allergy'], notes: 'Well done',
      },
      {
        id: 'i4', ticket_id: '2', name: 'Chicken Schnitzel', quantity: 1,
        modifiers: [{ name: 'Extra Sauce', type: 'preference' }], allergies: [],
      },
    ],
  },
  {
    id: '3', order_id: 'o3', station_id: 's3', status: 'ready',
    started_at: minsAgo(10), created_at: minsAgo(13), updated_at: now(),
    order: {
      id: 'o3', venue_id: 'v1', square_order_id: 'sq3', order_number: 'C05',
      customer_name: 'Walk-in', table_number: null, notes: null,
      source: 'square', total_amount: 1800, created_at: minsAgo(13), updated_at: now(),
    },
    station: { id: 's3', venue_id: 'v1', name: 'cold', display_name: 'Cold Section' },
    items: [
      {
        id: 'i5', ticket_id: '3', name: 'Caesar Salad', quantity: 1,
        modifiers: [
          { name: 'Vegan', type: 'dietary' },
          { name: 'No Croutons', type: 'preference' },
        ], allergies: [],
      },
    ],
  },
  {
    id: '4', order_id: 'o4', station_id: 's4', status: 'new',
    created_at: minsAgo(17), updated_at: now(),
    order: {
      id: 'o4', venue_id: 'v1', square_order_id: 'sq4', order_number: 'D88',
      customer_name: 'Michael T.', table_number: '12', notes: null,
      source: 'square', total_amount: 3200, created_at: minsAgo(17), updated_at: now(),
    },
    station: { id: 's4', venue_id: 'v1', name: 'pass', display_name: 'Pass / Expedite' },
    items: [
      {
        id: 'i6', ticket_id: '4', name: 'Eggs Benedict', quantity: 2,
        modifiers: [
          { name: 'Dairy Free', type: 'dietary' },
          { name: 'Shellfish Allergy', type: 'allergy' },
        ],
        allergies: ['Shellfish Allergy'],
      },
      {
        id: 'i7', ticket_id: '4', name: 'Smashed Avo Toast', quantity: 1,
        modifiers: [{ name: 'Add Feta', type: 'preference' }],
        allergies: [], notes: 'Sourdough only',
      },
    ],
  },
  {
    id: '5', order_id: 'o5', station_id: 's1', status: 'preparing',
    started_at: minsAgo(1), created_at: minsAgo(3), updated_at: now(),
    order: {
      id: 'o5', venue_id: 'v1', square_order_id: 'sq5', order_number: 'E21',
      customer_name: 'Priya', table_number: '2', notes: null,
      source: 'square', total_amount: 960, created_at: minsAgo(3), updated_at: now(),
    },
    station: { id: 's1', venue_id: 'v1', name: 'coffee', display_name: 'Coffee Bar' },
    items: [
      {
        id: 'i8', ticket_id: '5', name: 'Matcha Latte', quantity: 1,
        modifiers: [
          { name: 'Soy Milk', type: 'dietary' },
          { name: 'No Sugar', type: 'preference' },
        ], allergies: [],
      },
    ],
  },
];

export function KitchenDisplay() {
  const setTickets = useTicketStore((s) => s.setTickets);

  useSocket();

  useEffect(() => {
    if (MOCK_MODE) {
      setTickets(MOCK_TICKETS);
      return;
    }

    async function loadTickets() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      try {
        const res = await fetch(`${BACKEND_URL}/api/tickets/active`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) setTickets(await res.json());
      } catch (err) {
        console.error('[KDS] Failed to load initial tickets:', err);
      }
    }

    loadTickets();
  }, [setTickets]);

  return (
    <div className="flex flex-col h-screen bg-kds-bg overflow-hidden">
      <Header />
      <StationFilter />
      <main className="flex-1 overflow-y-auto">
        <TicketGrid />
      </main>
    </div>
  );
}
