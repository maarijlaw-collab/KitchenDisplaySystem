import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AnalyticsSummary } from '../types';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string) || 'http://localhost:3001';

function fmtTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function StatCard({ label, value, accent = 'text-white' }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-kds-surface rounded-xl border border-kds-border p-4">
      <div className="text-xs text-slate-600 uppercase tracking-widest font-semibold mb-1">{label}</div>
      <div className={`text-2xl font-bold tabular-nums ${accent}`}>{value}</div>
    </div>
  );
}

export function Analytics() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      try {
        const res = await fetch(`${BACKEND_URL}/api/analytics/summary`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) setSummary(await res.json());
      } catch (err) {
        console.error('[Analytics] Load failed:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-kds-bg">
      <header className="bg-kds-surface border-b border-kds-border px-4 py-3 flex items-center justify-between">
        <span className="text-white font-bold text-lg">Analytics</span>
        <Link to="/" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
          ← Kitchen
        </Link>
      </header>

      <main className="p-4 max-w-4xl mx-auto">
        {loading && (
          <div className="text-slate-600 text-sm mt-8 text-center">Loading…</div>
        )}

        {summary && (
          <div className="flex flex-col gap-5 mt-2">
            <div className="grid grid-cols-3 gap-4">
              <StatCard label="Total Tickets" value={summary.totalTickets.toLocaleString()} />
              <StatCard label="Avg Prep Time" value={fmtTime(summary.avgPrepTime)} />
              <StatCard
                label="Delayed"
                value={summary.delayedCount.toLocaleString()}
                accent={summary.delayedCount > 0 ? 'text-red-400' : 'text-white'}
              />
            </div>

            <div className="bg-kds-surface rounded-xl border border-kds-border p-4">
              <h3 className="text-slate-400 text-sm font-semibold mb-4">By Station</h3>
              <div className="flex flex-col divide-y divide-kds-border">
                {Object.entries(summary.byStation).map(([station, data]) => (
                  <div key={station} className="flex items-center justify-between py-3">
                    <span className="text-white font-semibold capitalize">{station}</span>
                    <div className="flex items-center gap-5 text-sm">
                      <span className="text-slate-500">{data.count} tickets</span>
                      <span className="text-slate-400 font-mono">{fmtTime(data.avgSeconds)}</span>
                      {data.delayed > 0 && (
                        <span className="text-red-400 font-semibold">{data.delayed} delayed</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
