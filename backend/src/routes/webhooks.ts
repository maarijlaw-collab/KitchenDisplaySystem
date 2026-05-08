import { Router, Request, Response } from 'express';
import { verifySquareWebhook } from '../middleware/webhookVerify';
import { ticketService } from '../services/ticketService';
import { squareService } from '../services/squareService';
import { SquareWebhookPayload } from '../types';

const router = Router();

router.post('/square', verifySquareWebhook, async (req: Request, res: Response) => {
  // Acknowledge immediately — Square expects a fast response
  res.status(200).json({ received: true });

  const payload = JSON.parse((req.body as Buffer).toString('utf8')) as SquareWebhookPayload;
  const io = req.app.get('io');

  try {
    switch (payload.type) {
      case 'order.created': {
        const squareOrderId = payload.data.id;
        const locationId = (payload.data.object as any)?.order_created?.location_id as string;
        await handleOrderCreated(squareOrderId, locationId, io);
        break;
      }
      case 'order.updated': {
        await handleOrderUpdated(payload.data.id, io);
        break;
      }
      case 'order.fulfillment.updated': {
        await handleFulfillmentUpdated(payload, io);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error('[Webhook] Processing error:', err);
  }
});

async function handleOrderCreated(squareOrderId: string, locationId: string, io: any) {
  const squareOrder = await squareService.fetchOrder(squareOrderId);
  if (!squareOrder) return;

  const { order, tickets } = await ticketService.createOrderFromSquare(squareOrder, locationId);

  io.emit('order:new', { order, tickets });
  io.emit('notification:sound', { type: 'new_order' });

  console.log(`[Webhook] New order created: #${order.order_number}`);
}

async function handleOrderUpdated(squareOrderId: string, _io: any) {
  const squareOrder = await squareService.fetchOrder(squareOrderId);
  if (!squareOrder) return;
  await ticketService.syncOrderFromSquare(squareOrder);
}

async function handleFulfillmentUpdated(payload: SquareWebhookPayload, io: any) {
  const fulfillmentState = (payload.data.object as any)?.fulfillment?.state;
  if (fulfillmentState === 'COMPLETED') {
    await ticketService.completeOrderTickets(payload.data.id, io);
  }
}

export default router;
