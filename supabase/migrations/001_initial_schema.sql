-- Kitchen Display System — Initial Schema
-- Run via: supabase db push

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Venues (multi-store foundation) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS venues (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  square_location_id TEXT UNIQUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Stations ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id     UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name         TEXT NOT NULL CHECK (name IN ('coffee', 'grill', 'cold', 'pass')),
  display_name TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (venue_id, name)
);

-- ─── Orders ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id        UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  square_order_id TEXT UNIQUE,
  order_number    TEXT NOT NULL,
  customer_name   TEXT,
  table_number    TEXT,
  notes           TEXT,
  source          TEXT NOT NULL DEFAULT 'square' CHECK (source IN ('square', 'manual')),
  total_amount    INTEGER, -- cents
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Tickets (one per station per order) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id               UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  station_id             UUID NOT NULL REFERENCES stations(id),
  status                 TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'preparing', 'ready', 'completed')),
  started_at             TIMESTAMPTZ,
  completed_at           TIMESTAMPTZ,
  prep_duration_seconds  INTEGER,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Ticket Items ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_items (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id  UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  quantity   INTEGER NOT NULL DEFAULT 1,
  modifiers  JSONB NOT NULL DEFAULT '[]',
  allergies  JSONB NOT NULL DEFAULT '[]',
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Prep Analytics ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prep_analytics (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id              UUID REFERENCES venues(id) ON DELETE SET NULL,
  station_id            UUID REFERENCES stations(id) ON DELETE SET NULL,
  ticket_id             UUID REFERENCES tickets(id) ON DELETE SET NULL,
  prep_duration_seconds INTEGER,
  was_delayed           BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tickets_status     ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_station    ON tickets(station_id);
CREATE INDEX IF NOT EXISTS idx_tickets_order      ON tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created    ON tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_venue       ON orders(venue_id);
CREATE INDEX IF NOT EXISTS idx_orders_square      ON orders(square_order_id);
CREATE INDEX IF NOT EXISTS idx_analytics_venue    ON prep_analytics(venue_id);
CREATE INDEX IF NOT EXISTS idx_analytics_station  ON prep_analytics(station_id);
CREATE INDEX IF NOT EXISTS idx_analytics_created  ON prep_analytics(created_at);

-- ─── updated_at trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE venues         ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE prep_analytics ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all data (kitchen screens)
CREATE POLICY "auth_read_venues"         ON venues         FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_stations"       ON stations       FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_orders"         ON orders         FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_tickets"        ON tickets        FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_ticket_items"   ON ticket_items   FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_analytics"      ON prep_analytics FOR SELECT TO authenticated USING (true);

-- Backend uses service_role key which bypasses RLS entirely — no write policies needed for anon/authenticated
