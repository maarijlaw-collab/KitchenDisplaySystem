import { Client, Environment } from 'square';
import { Modifier, ParsedItem, StationSlug } from '../types';

const client = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN!,
  environment: process.env.SQUARE_ENVIRONMENT === 'production'
    ? Environment.Production
    : Environment.Sandbox,
});

export const squareService = {
  async fetchOrder(squareOrderId: string) {
    try {
      const response = await client.ordersApi.retrieveOrder(squareOrderId);
      return response.result.order || null;
    } catch (err) {
      console.error('[Square] Failed to fetch order:', err);
      return null;
    }
  },

  async listLocations() {
    try {
      const response = await client.locationsApi.listLocations();
      return response.result.locations || [];
    } catch (err) {
      console.error('[Square] Failed to list locations:', err);
      return [];
    }
  },

  parseOrderNumber(order: any): string {
    return order.ticketName || order.referenceId || order.id.slice(-6).toUpperCase();
  },

  parseCustomerName(order: any): string | null {
    return order.fulfillments?.[0]?.pickupDetails?.recipient?.displayName || null;
  },

  parseTableNumber(order: any): string | null {
    return order.referenceId || null;
  },

  parseItems(order: any): ParsedItem[] {
    if (!order.lineItems) return [];

    return order.lineItems.map((item: any): ParsedItem => {
      const modifiers: Modifier[] = [];
      const allergies: string[] = [];

      (item.modifiers || []).forEach((mod: any) => {
        const name: string = mod.name || '';
        const lower = name.toLowerCase();
        if (ALLERGY_KEYWORDS.some((k) => lower.includes(k))) {
          allergies.push(name);
          modifiers.push({ name, type: 'allergy' });
        } else if (DIETARY_KEYWORDS.some((k) => lower.includes(k))) {
          modifiers.push({ name, type: 'dietary' });
        } else {
          modifiers.push({ name, type: 'preference' });
        }
      });

      return {
        name: item.name || 'Item',
        quantity: parseInt(item.quantity || '1'),
        modifiers,
        allergies,
        notes: item.note || undefined,
        stationSlug: categorizeItem(item.name || ''),
      };
    });
  },
};

const ALLERGY_KEYWORDS = ['nut', 'dairy', 'gluten', 'egg', 'soy', 'shellfish', 'fish', 'wheat', 'allergy', 'intolerance', 'lactose'];
const DIETARY_KEYWORDS = ['vegan', 'vegetarian', 'plant-based', 'dairy-free', 'gluten-free', ' gf', ' v ', ' vg '];

function categorizeItem(name: string): StationSlug {
  const lower = name.toLowerCase();

  if (['coffee', 'latte', 'cappuccino', 'espresso', 'flat white', 'macchiato', 'mocha', 'americano',
    'cold brew', 'tea', 'chai', 'matcha', 'juice', 'smoothie', 'milkshake', 'hot choc', 'beverage', 'drink']
    .some((t) => lower.includes(t))) return 'coffee';

  if (['burger', 'steak', 'chicken', 'grill', 'bbq', 'beef', 'pork', 'lamb', 'ribs',
    'brisket', 'wings', 'hot dog', 'sausage', 'bacon', 'schnitzel']
    .some((t) => lower.includes(t))) return 'grill';

  if (['salad', 'sandwich', 'wrap', 'roll', 'sub', 'sushi', 'poke', 'bowl', 'noodle', 'pasta', 'rice', 'cold']
    .some((t) => lower.includes(t))) return 'cold';

  return 'pass';
}
