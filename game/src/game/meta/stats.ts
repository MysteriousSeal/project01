import type { RunResult } from '../sim/engine';
import type { RunConfig } from './session';

export type RunRow = {
  id: string;
  mode: RunConfig['mode'];
  challenge_type: string | null;
  challenge_day: string | null;
  value: number;
  score: number;
  coins: number;
  perfects: number;
  best_combo: number;
  planets: number;
  duration_ms: number;
  death: string | null;
};

export type SessionRow = { id: string; started_at: string; ended_at: string; platform: string };

export type Board = { kind: 'all' } | { kind: 'week' } | { kind: 'daily'; day: string; type: string };

export type BoardEntry = { rank: number; name: string; value: number; me: boolean };

export function runRow(id: string, config: RunConfig, r: RunResult, day: string | null): RunRow {
  const daily = config.mode === 'daily' && config.challenge !== undefined;
  return {
    id,
    mode: config.mode,
    challenge_type: daily ? config.challenge!.id : null,
    challenge_day: daily ? day : null,
    value: daily && config.challenge!.stat === 'coins' ? r.coins : r.score,
    score: r.score,
    coins: r.coins,
    perfects: r.perfects,
    best_combo: r.bestCombo,
    planets: r.planets,
    duration_ms: Math.max(0, Math.round(r.time * 1000)),
    death: r.death,
  };
}

const between = (v: number, max: number) => Number.isInteger(v) && v >= 0 && v <= max;

export function isPlausibleRun(r: RunRow) {
  return (
    between(r.score, 1_000_000) && between(r.coins, 100_000) && between(r.perfects, 100_000) && between(r.best_combo, 100_000) &&
    between(r.planets, 100_000) && between(r.value, 1_000_000) && between(r.duration_ms, 86_400_000) &&
    r.score >= r.planets && r.perfects <= r.planets && r.planets <= 10 + Math.floor(r.duration_ms / 200) &&
    (r.mode === 'daily') === (r.challenge_type !== null && r.challenge_day !== null)
  );
}

export function uuid(rng: () => number = Math.random) {
  const hex = Array.from({ length: 32 }, () => Math.floor(rng() * 16).toString(16));
  hex[12] = '4';
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const h = hex.join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
