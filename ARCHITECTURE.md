# Kitchen Display System (KDS) — Architecture

Fast, operational kitchen workflow system for cafes and restaurants, integrated with Square POS.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite 5 + TypeScript + Tailwind CSS |
| State | Zustand |
| Realtime | Socket.IO (client + server) |
| Backend | Node.js + Express + TypeScript |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth |
| POS | Square Orders API + Webhooks |
| Deploy FE | Vercel |
| Deploy BE | Render |

---

## Folder Structure

```
KitchenDisplaySystem/
├── backend/
│   ├── src/
│   │   ├── db/supabase.ts              # Supabase service-role client
│   │   ├── middleware/
│   │   │   ├── auth.ts                 # Supabase JWT verification
│   │   │   └── webhookVerify.ts        # Square HMAC-SHA256 signature check
│   │   ├── routes/
│   │   │   ├── webhooks.ts             # Square webhook handler
│   │   │   ├── tickets.ts              # Ticket CRUD + status updates
│   │   │   ├── orders.ts               # Order read API
│   │   │   └── analytics.ts            # Prep time + peak hours
│   │   ├── services/
│   │   │   ├── squareService.ts        # Square API client + item parsing
│   │   │   └── ticketService.ts        # Core ticket business logic
│   │   ├── socket/socketHandlers.ts    # Socket.IO event wiring
│   │   ├── types/index.ts              # Shared TypeScript types
│   │   └── index.ts                    # Express server entry point
│   ├── render.yaml                     # Render deployment config
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── tickets/
│   │   │   │   ├── TicketCard.tsx      # Individual ticket display + actions
│   │   │   │   ├── TicketGrid.tsx      # Responsive ticket grid
│   │   │   │   ├── TicketTimer.tsx     # Live elapsed prep timer
│   │   │   │   └── ModifierBadge.tsx   # Allergy/dietary/preference badges
│   │   │   └── layout/
│   │   │       ├── Header.tsx          # Status bar: time, connection, counts
│   │   │       └── StationFilter.tsx   # Station tab selector
│   │   ├── hooks/
│   │   │   ├── useSocket.ts            # Socket.IO event subscription
│   │   │   └── useSound.ts             # Web Audio API notification sounds
│   │   ├── lib/
│   │   │   ├── supabase.ts             # Supabase anon client
│   │   │   └── socket.ts               # Socket.IO singleton
│   │   ├── pages/
│   │   │   ├── KitchenDisplay.tsx      # Main kitchen screen
│   │   │   ├── Login.tsx               # Auth screen
│   │   │   └── Analytics.tsx           # Prep time analytics
│   │   ├── stores/ticketStore.ts       # Zustand global state
│   │   ├── types/index.ts              # TypeScript types
│   │   ├── App.tsx                     # Router + auth gate
│   │   ├── main.tsx
│   │   └── index.css                   # Tailwind imports
│   ├── vercel.json                     # SPA rewrite rule
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── package.json
│
└── supabase/
    ├── migrations/001_initial_schema.sql
    └── seed.sql
```

---

## Database Schema

```
venues ──────────────────────────────────────────────────────────
  id, name, square_location_id

stations ───────────────────────────────────────────────────────
  id, venue_id, name (coffee|grill|cold|pass), display_name

orders ─────────────────────────────────────────────────────────
  id, venue_id, square_order_id, order_number,
  customer_name, table_number, notes, source, total_amount

tickets ────────────────────────────────────────────────────────
  id, order_id, station_id, status (new|preparing|ready|completed)
  started_at, completed_at, prep_duration_seconds

ticket_items ───────────────────────────────────────────────────
  id, ticket_id, name, quantity, modifiers (JSONB), allergies (JSONB), notes

prep_analytics ─────────────────────────────────────────────────
  id, venue_id, station_id, ticket_id,
  prep_duration_seconds, was_delayed
```

---

## Socket.IO Events

### Server → Client (broadcast)

| Event | Payload | When |
|-------|---------|------|
| `order:new` | `{ order, tickets[] }` | Square webhook: order.created |
| `ticket:status_changed` | `{ ticketId, status, updatedAt }` | Any screen updates a ticket |
| `ticket:delayed` | `{ ticketId, elapsedSeconds, orderNumber }` | Monitor: ticket >15 min old |
| `notification:sound` | `{ type: 'new_order' \| 'delayed' \| 'ready' }` | Alongside above events |

### Client → Server

| Event | Payload | Action |
|-------|---------|--------|
| `ticket:update_status` | `{ ticketId, status }` | Update DB + broadcast change |
| `station:join` | `{ stationId }` | Join socket room for filtering |

---

## Square Webhook Flow

```
Square POS
  → POST /api/webhooks/square
    → HMAC-SHA256 signature verified
    → order.created: fetch full order via Square API
      → parse items → assign to stations
      → insert orders + tickets + ticket_items into Supabase
      → io.emit('order:new', { order, tickets })
      → io.emit('notification:sound', { type: 'new_order' })
    → order.fulfillment.updated (COMPLETED):
      → mark all order tickets as completed
      → broadcast ticket:status_changed for each
```

---

## Item → Station Auto-Categorisation

| Station | Keywords matched |
|---------|----------------|
| **coffee** | coffee, latte, cappuccino, espresso, flat white, tea, juice, smoothie, matcha… |
| **grill** | burger, steak, chicken, bbq, beef, pork, wings, sausage, bacon… |
| **cold** | salad, sandwich, wrap, sushi, poke, bowl, pasta, rice… |
| **pass** | Everything else (final assembly + expediting) |

---

## Modifier Badge System

| Type | Colour | Trigger keywords |
|------|--------|----------------|
| `allergy` | Red ⚠ | nut, dairy, gluten, egg, soy, shellfish, fish, wheat |
| `dietary` | Green | vegan, vegetarian, gluten-free, dairy-free, plant-based |
| `preference` | Blue | everything else (extra sauce, no onion, etc.) |

---

## Deployment Checklist

### Supabase
1. Create project → copy URL + anon key + service role key
2. Run `supabase/migrations/001_initial_schema.sql`
3. Run `supabase/seed.sql`
4. Create kitchen user: Auth → Users → Invite
5. Set `user_metadata.role = "kitchen"` (or `"admin"`)

### Backend (Render)
1. Connect repo → set root to `backend/`
2. Build: `npm install && npm run build` | Start: `npm start`
3. Set all env vars from `.env.example`
4. Copy webhook URL (e.g. `https://kds-backend.onrender.com/api/webhooks/square`)

### Frontend (Vercel)
1. Connect repo → set root to `frontend/`
2. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_BACKEND_URL`
3. Deploy

### Square Developer Console
1. Webhooks → Add endpoint → paste Render URL
2. Subscribe to: `order.created`, `order.updated`, `order.fulfillment.updated`
3. Copy Signature Key → set as `SQUARE_WEBHOOK_SIGNATURE_KEY` on Render

---

## Future Scalability Hooks

All tables carry `venue_id` — add venue selector to frontend for multi-store.

- **Mobile push notifications**: extend `notification:sound` handler in `useSocket.ts`
- **Staff analytics**: add `staff_id` to tickets, join to a `staff` table
- **Inventory integration**: hook into `ticket:completed` to decrement stock
- **Labour tracking**: store staff_id + timestamps in prep_analytics
