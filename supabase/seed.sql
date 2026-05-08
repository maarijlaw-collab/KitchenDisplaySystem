-- Seed: Demo venue + stations for local development
-- Run after migration: supabase db seed

INSERT INTO venues (id, name, square_location_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Venue', 'DEMO_LOCATION_ID')
ON CONFLICT (id) DO NOTHING;

INSERT INTO stations (venue_id, name, display_name)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'coffee', 'Coffee Bar'),
  ('00000000-0000-0000-0000-000000000001', 'grill',  'Grill Station'),
  ('00000000-0000-0000-0000-000000000001', 'cold',   'Cold Section'),
  ('00000000-0000-0000-0000-000000000001', 'pass',   'Pass / Expedite')
ON CONFLICT (venue_id, name) DO NOTHING;
