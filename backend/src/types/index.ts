export type TicketStatus = 'new' | 'preparing' | 'ready' | 'completed';
export type StationSlug = 'coffee' | 'grill' | 'cold' | 'pass';
export type SoundType = 'new_order' | 'delayed' | 'ready';

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
  tickets?: Ticket[];
}

export interface Station {
  id: string;
  venue_id: string;
  name: StationSlug;
  display_name: string;
}

export interface Venue {
  id: string;
  name: string;
  square_location_id?: string | null;
  created_at: string;
}

export interface ParsedItem {
  name: string;
  quantity: number;
  modifiers: Modifier[];
  allergies: string[];
  notes?: string;
  stationSlug: StationSlug;
}

export interface SquareWebhookPayload {
  merchant_id: string;
  type: string;
  event_id: string;
  created_at: string;
  data: {
    type: string;
    id: string;
    object: Record<string, unknown>;
  };
}
