import { useRef, useCallback } from 'react';
import { SoundType } from '../types';

interface Tone {
  freq: number;
  time: number;
  duration: number;
}

const SOUND_CONFIG: Record<SoundType, Tone[]> = {
  new_order: [
    { freq: 880, time: 0, duration: 0.12 },
    { freq: 1046, time: 0.18, duration: 0.14 },
  ],
  delayed: [
    { freq: 440, time: 0, duration: 0.25 },
    { freq: 330, time: 0.3, duration: 0.25 },
  ],
  ready: [
    { freq: 1046, time: 0, duration: 0.18 },
    { freq: 1318, time: 0.22, duration: 0.28 },
  ],
};

export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  const playSound = useCallback((type: SoundType) => {
    try {
      if (!ctxRef.current) {
        ctxRef.current = new AudioContext();
      }
      const ctx = ctxRef.current;

      SOUND_CONFIG[type].forEach(({ freq, time, duration }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + time);

        gain.gain.setValueAtTime(0, ctx.currentTime + time);
        gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + time + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + duration);

        osc.start(ctx.currentTime + time);
        osc.stop(ctx.currentTime + time + duration + 0.02);
      });
    } catch {
      // Audio unavailable — silent fail
    }
  }, []);

  return { playSound };
}
