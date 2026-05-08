import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import { setupSocketHandlers } from './socket/socketHandlers';
import webhooksRouter from './routes/webhooks';
import ticketsRouter from './routes/tickets';
import ordersRouter from './routes/orders';
import analyticsRouter from './routes/analytics';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
});

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Raw body required for Square webhook HMAC verification — must precede express.json()
app.use('/api/webhooks', express.raw({ type: 'application/json' }));
app.use(express.json());

app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/webhooks', webhooksRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/analytics', analyticsRouter);

setupSocketHandlers(io);

// Make io accessible in route handlers via req.app.get('io')
app.set('io', io);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`[KDS] Backend listening on port ${PORT}`);
});
