import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTicketStore } from '../../stores/ticketStore';

export function Header() {
  const [time, setTime] = useState(new Date());
  const isConnected = useTicketStore((s) => s.isConnected);
  const tickets = useTicketStore((s) => s.tickets);
  const activeCount = tickets.filter((t) => t.status !== 'completed').length;
  const newCount = tickets.filter((t) => t.status === 'new').length;

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="bg-kds-surface border-b border-kds-border px-4 py-3 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-white font-bold text-lg tracking-tight">KDS</span>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full transition-colors ${isConnected ? 'bg-green-400' : 'bg-red-500 animate-pulse'}`} />
          <span className="text-xs text-slate-600">{isConnected ? 'Live' : 'Reconnecting…'}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {newCount > 0 && (
          <div className="bg-blue-900/50 text-blue-300 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-700">
            {newCount} new
          </div>
        )}
        {activeCount > 0 && (
          <div className="bg-kds-border text-slate-400 text-xs font-bold px-2.5 py-1 rounded-full">
            {activeCount} active
          </div>
        )}
        <Link
          to="/analytics"
          className="text-slate-600 hover:text-slate-400 text-xs transition-colors"
        >
          Analytics
        </Link>
        <div className="text-slate-500 font-mono text-sm tabular-nums">
          {time.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
        </div>
      </div>
    </header>
  );
}
