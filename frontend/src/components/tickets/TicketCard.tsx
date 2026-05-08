import { Ticket, TicketStatus } from '../../types';
import { TicketTimer } from './TicketTimer';
import { ModifierBadge } from './ModifierBadge';
import { getSocket } from '../../lib/socket';
import { useTicketStore } from '../../stores/ticketStore';

interface Props {
  ticket: Ticket;
}

const STATUS_CONFIG: Record<TicketStatus, {
  border: string;
  badge: string;
  label: string;
  next: TicketStatus | null;
  nextLabel: string;
  btnStyle: string;
}> = {
  new: {
    border: 'border-blue-500',
    badge: 'bg-blue-900/60 text-blue-300',
    label: 'NEW',
    next: 'preparing',
    nextLabel: 'Start Preparing',
    btnStyle: 'bg-blue-600 hover:bg-blue-500 text-white',
  },
  preparing: {
    border: 'border-amber-400',
    badge: 'bg-amber-900/60 text-amber-300',
    label: 'PREPARING',
    next: 'ready',
    nextLabel: 'Mark Ready',
    btnStyle: 'bg-amber-500 hover:bg-amber-400 text-black',
  },
  ready: {
    border: 'border-green-500',
    badge: 'bg-green-900/60 text-green-300',
    label: 'READY',
    next: 'completed',
    nextLabel: 'Complete',
    btnStyle: 'bg-green-600 hover:bg-green-500 text-white',
  },
  completed: {
    border: 'border-slate-700',
    badge: 'bg-slate-800 text-slate-500',
    label: 'DONE',
    next: null,
    nextLabel: '',
    btnStyle: '',
  },
};

export function TicketCard({ ticket }: Props) {
  const updateTicketStatus = useTicketStore((s) => s.updateTicketStatus);
  const cfg = STATUS_CONFIG[ticket.status];

  function advance() {
    if (!cfg.next) return;
    updateTicketStatus(ticket.id, cfg.next, new Date().toISOString());
    getSocket().emit('ticket:update_status', { ticketId: ticket.id, status: cfg.next });
  }

  const hasAllergies = ticket.items?.some((i) => i.allergies?.length > 0);

  return (
    <div
      className={`bg-kds-card rounded-xl border-l-4 ${cfg.border} p-4 flex flex-col gap-3 touch-manipulation select-none`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-2xl font-bold text-white tracking-tight leading-none">
            #{ticket.order?.order_number}
          </div>
          {ticket.order?.customer_name && (
            <div className="text-sm text-slate-300 mt-1 truncate">{ticket.order.customer_name}</div>
          )}
          {ticket.order?.table_number && (
            <div className="text-xs text-slate-500 mt-0.5">Table {ticket.order.table_number}</div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${cfg.badge}`}>
            {cfg.label}
          </span>
          <TicketTimer createdAt={ticket.created_at} />
        </div>
      </div>

      {/* Station label */}
      {ticket.station && (
        <div className="text-xs text-slate-600 uppercase tracking-widest font-semibold">
          {ticket.station.display_name}
        </div>
      )}

      {/* Allergy warning banner */}
      {hasAllergies && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg px-3 py-1.5 text-xs font-bold text-red-300 tracking-wide">
          ⚠ ALLERGY — check modifiers
        </div>
      )}

      <div className="border-t border-kds-border" />

      {/* Items */}
      <div className="flex flex-col gap-2.5 flex-1">
        {ticket.items?.map((item) => (
          <div key={item.id} className="flex flex-col gap-1">
            <div className="flex items-baseline gap-2">
              <span className="text-slate-500 text-sm font-mono shrink-0">{item.quantity}×</span>
              <span className="text-white font-semibold leading-tight">{item.name}</span>
            </div>
            {item.modifiers?.length > 0 && (
              <div className="flex flex-wrap gap-1 ml-6">
                {item.modifiers.map((mod, i) => (
                  <ModifierBadge key={i} modifier={mod} />
                ))}
              </div>
            )}
            {item.notes && (
              <div className="ml-6 text-xs text-slate-400 italic">{item.notes}</div>
            )}
          </div>
        ))}
      </div>

      {/* Order-level notes */}
      {ticket.order?.notes && (
        <div className="text-xs text-amber-300/90 bg-amber-900/20 border border-amber-800/40 rounded-lg px-3 py-2">
          {ticket.order.notes}
        </div>
      )}

      {/* Action button */}
      {cfg.next && (
        <button
          onClick={advance}
          className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all active:scale-95 ${cfg.btnStyle}`}
        >
          {cfg.nextLabel}
        </button>
      )}
    </div>
  );
}
