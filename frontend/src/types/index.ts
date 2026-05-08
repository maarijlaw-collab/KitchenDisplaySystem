export type TicketStatus = 'new' | 'preparing' | 'ready' | 'completed';
export type StationSlug = 'all' | 'coffee' | 'grill' | 'cold' | 'pass';
export type SoundType = 'new_order' | 'delayed' | 'ready';
export type UserRole = 'admin' | 'kitchen';

export interface Modifier {
  name: string;
  type: 'allergy' | 'dietary' | 'preference';
}

export interface TicketItem {
  id: string;
  ticket_id: string;
  name: string;
  quantity: number;
  modifiers: Modifier[];
  allergies: string[];
  notes?: string | null;
}

export interface Station {
  id: string;
  venue_id: string;
  name: StationSlug;
  display_name: string;
}

export interface Order {
  id: string;
  venue_id: string;
  square_order_id: string;
  order_number: string;
  customer_name?: string | null;
  table_number?: string | null;
  notes?: string | null;
  source: 'square' | 'manual';
  total_amount?: number | null;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  order_id: string;
  station_id: string;
  status: TicketStatus;
  started_at?: string | null;
  completed_at?: string | null;
  prep_duration_seconds?: number | null;
  created_at: string;
  updated_at: string;
  items?: TicketItem[];
  order?: Order;
  station?: Station;
}

export interface AnalyticsSummary {
  totalTickets: number;
  avgPrepTime: number;
  delayedCount: number;
  byStation: Record<string, { count: number; avgSeconds: number; delayed: number }>;
}
