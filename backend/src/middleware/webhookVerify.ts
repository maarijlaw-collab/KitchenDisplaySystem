import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export function verifySquareWebhook(req: Request, res: Response, next: NextFunction) {
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

  if (!signatureKey) {
    console.error('[Webhook] SQUARE_WEBHOOK_SIGNATURE_KEY not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const signature = req.headers['x-square-hmacsha256-signature'] as string;

  if (!signature) {
    return res.status(400).json({ error: 'Missing webhook signature' });
  }

  // Square computes HMAC-SHA256 over: notification_url + raw_body
  const notificationUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const body = req.body as Buffer;
  const payload = notificationUrl + body.toString('utf8');

  const computed = crypto.createHmac('sha256', signatureKey).update(payload).digest('base64');

  if (computed !== signature) {
    console.warn('[Webhook] Signature mismatch — possible replay or misconfiguration');
    return res.status(403).json({ error: 'Invalid signature' });
  }

  next();
}
