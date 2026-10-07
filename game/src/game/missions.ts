import type { RunResult } from './engine';
import type { Rng } from './rng';

export type MissionKind = 'score' | 'coins' | 'perfects' | 'combo' | 'games' | 'totalScore';
export type Mission = { id: string; kind: MissionKind; target: number; progress: number; reward: number };

export const MISSION_KINDS: MissionKind[] = ['score', 'coins', 'perfects', 'combo', 'games', 'totalScore'];
export const MISSION_SLOTS = 3;

const CUMULATIVE: ReadonlySet<MissionKind> = new Set(['games', 'totalScore']);

export function missionLabel(m: Mission) {
  switch (m.kind) {
    case 'score': return `Reach ${m.target} in one run`;
    case 'coins': return `Collect ${m.target} coins in one run`;
    case 'perfects': return `Land ${m.target} perfects in one run`;
    case 'combo': return `Hit a x${m.target} combo`;
    case 'games': return `Play ${m.target} games`;
    case 'totalScore': return `Score ${m.target} total`;
  }
}

export const isDone = (m: Mission) => m.progress >= m.target;

function targetFor(kind: MissionKind, lvl: number) {
  const f = 1 + (lvl - 1) * 0.25;
  switch (kind) {
    case 'score': return Math.round(10 * f);
    case 'coins': return Math.round(3 * f);
    case 'perfects': return Math.round(3 * f);
    case 'combo': return Math.min(2 + Math.floor(lvl / 2), 12);
    case 'games': return 3 + Math.floor(lvl / 3);
    case 'totalScore': return Math.round(40 * f);
  }
}

export function makeMission(lvl: number, avoid: MissionKind[], rng: Rng = Math.random): Mission {
  const pool = MISSION_KINDS.filter((k) => !avoid.includes(k));
  const kind = pool[Math.floor(rng() * pool.length)] ?? 'score';
  return { id: `${kind}-${Date.now().toString(36)}-${Math.floor(rng() * 1e9).toString(36)}`, kind, target: targetFor(kind, lvl), progress: 0, reward: 10 + lvl * 4 };
}

export function fillMissions(missions: Mission[], lvl: number, rng: Rng = Math.random): Mission[] {
  const out = [...missions];
  while (out.length < MISSION_SLOTS) out.push(makeMission(lvl, out.map((m) => m.kind), rng));
  return out;
}

function runValue(m: Mission, r: RunResult) {
  switch (m.kind) {
    case 'score': return r.score;
    case 'coins': return r.coins;
    case 'perfects': return r.perfects;
    case 'combo': return r.bestCombo;
    case 'games': return 1;
    case 'totalScore': return r.score;
  }
}

export function advanceMission(m: Mission, r: RunResult): Mission {
  const v = runValue(m, r);
  const progress = CUMULATIVE.has(m.kind) ? m.progress + v : Math.max(m.progress, v);
  return { ...m, progress: Math.min(progress, m.target) };
}
