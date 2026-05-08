import { create } from 'zustand';
import { Ticket, TicketStatus, StationSlug } from '../types';

interface TicketStore {
  tickets: Ticket[];
  activeStation: StationSlug;
  isConnected: boolean;

  setTickets: (tickets: Ticket[]) => void;
  addTicket: (ticket: Ticket) => void;
  updateTicketStatus: (ticketId: string, status: TicketStatus, updatedAt: string) => void;
  setActiveStation: (station: StationSlug) => void;
  setConnected: (connected: boolean) => void;
  getFilteredTickets: () => Ticket[];
}

export const useTicketStore = create<TicketStore>((set, get) => ({
  tickets: [],
  activeStation: 'all',
  isConnected: false,

  setTickets: (tickets) => set({ tickets }),

  addTicket: (ticket) =>
    set((state) => ({ tickets: [ticket, ...state.tickets] })),

  updateTicketStatus: (ticketId, status, updatedAt) =>
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId ? { ...t, status, updated_at: updatedAt } : t
      ),
    })),

  setActiveStation: (station) => set({ activeStation: station }),
  setConnected: (connected) => set({ isConnected: connected }),

  getFilteredTickets: () => {
    const { tickets, activeStation } = get();
    const active = tickets.filter((t) => t.status !== 'completed');

    const filtered =
      activeStation === 'all'
        ? active
        : active.filter((t) => t.station?.name === activeStation);

    const order: Record<TicketStatus, number> = { new: 0, preparing: 1, ready: 2, completed: 3 };
    return [...filtered].sort((a, b) => {
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  },
}));
