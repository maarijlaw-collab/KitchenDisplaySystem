import { useState, useEffect } from 'react';

interface Props {
  createdAt: string;
  delayThresholdSeconds?: number;
}

export function TicketTimer({ createdAt, delayThresholdSeconds = 900 }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(createdAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [createdAt]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const isDelayed = elapsed >= delayThresholdSeconds;
  const isWarning = elapsed >= delayThresholdSeconds * 0.7;

  return (
    <span
      className={`font-mono text-sm font-bold tabular-nums ${
        isDelayed ? 'text-red-400 animate-pulse' : isWarning ? 'text-amber-400' : 'text-slate-500'
      }`}
    >
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </span>
  );
}
