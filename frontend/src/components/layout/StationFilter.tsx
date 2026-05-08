import { useTicketStore } from '../../stores/ticketStore';
import { getSocket } from '../../lib/socket';
import { StationSlug } from '../../types';

const STATIONS: { slug: StationSlug; label: string; activeStyle: string }[] = [
  { slug: 'all',    label: 'All',     activeStyle: 'border-slate-400 text-white bg-slate-700/40' },
  { slug: 'coffee', label: 'Coffee',  activeStyle: 'border-amber-500 text-amber-300 bg-amber-900/30' },
  { slug: 'grill',  label: 'Grill',   activeStyle: 'border-red-500 text-red-300 bg-red-900/30' },
  { slug: 'cold',   label: 'Cold',    activeStyle: 'border-cyan-500 text-cyan-300 bg-cyan-900/30' },
  { slug: 'pass',   label: 'Pass',    activeStyle: 'border-purple-500 text-purple-300 bg-purple-900/30' },
];

export function StationFilter() {
  const activeStation = useTicketStore((s) => s.activeStation);
  const setActiveStation = useTicketStore((s) => s.setActiveStation);
  const tickets = useTicketStore((s) => s.tickets);

  function countForStation(slug: StationSlug) {
    if (slug === 'all') return tickets.filter((t) => t.status !== 'completed').length;
    return tickets.filter((t) => t.status !== 'completed' && t.station?.name === slug).length;
  }

  function handleSelect(slug: StationSlug) {
    setActiveStation(slug);
    getSocket().emit('station:join', { stationId: slug });
  }

  return (
    <div className="flex gap-2 px-4 py-2.5 bg-kds-surface border-b border-kds-border overflow-x-auto shrink-0">
      {STATIONS.map(({ slug, label, activeStyle }) => {
        const count = countForStation(slug);
        const isActive = activeStation === slug;
        return (
          <button
            key={slug}
            onClick={() => handleSelect(slug)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border font-semibold text-sm whitespace-nowrap transition-all ${
              isActive
                ? activeStyle
                : 'border-kds-border text-slate-600 hover:border-slate-600 hover:text-slate-400'
            }`}
          >
            {label}
            {count > 0 && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/10' : 'bg-kds-border text-slate-500'}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
