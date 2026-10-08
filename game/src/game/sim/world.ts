import { planetHue } from '../palette';
import { between, type Rng } from './rng';

export const WORLD = {
  bossEvery: 25,
  bossRadius: 54,
  bossOrbitPad: 34,
  bossGapHalf: 0.75,
  preBossBreather: 2,
  planetsPerZone: 20,
} as const;

export type Rules = {
  bossEvery: number;
  fuseScale: number;
  feverEvery: number;
  feverBonus: number;
  perfectOnly: boolean;
  movingFrom: number;
  moveChance: number | null;
  powerups: boolean;
  coinChance: number;
  goldChance: number;
};

export const DEFAULT_RULES: Rules = {
  bossEvery: WORLD.bossEvery,
  fuseScale: 1,
  feverEvery: 5,
  feverBonus: 0,
  perfectOnly: false,
  movingFrom: 13,
  moveChance: null,
  powerups: true,
  coinChance: 0.65,
  goldChance: 0.12,
};

export type Mods = { fuseBonus: number; magnetTime: number; feverTime: number; powerChance: number; startShield: boolean };

export const DEFAULT_MODS: Mods = { fuseBonus: 0, magnetTime: 8, feverTime: 6, powerChance: 0.1, startShield: false };

export const ZONES = [
  { name: 'DEEP SPACE', bg: '#0b1026' },
  { name: 'NEBULA', bg: '#1d0b2e' },
  { name: 'ICE FIELD', bg: '#06202b' },
  { name: 'INFERNO', bg: '#2a0b0b' },
  { name: 'EMERALD VOID', bg: '#04261a' },
  { name: 'THE BEYOND', bg: '#000000' },
];

export const zoneIndex = (planetIdx: number) => Math.min(Math.floor(planetIdx / WORLD.planetsPerZone), ZONES.length - 1);
export const zoneOf = (planetIdx: number) => ZONES[zoneIndex(planetIdx)];

export type Planet = {
  idx: number;
  x: number;
  baseX: number;
  y: number;
  r: number;
  orbit: number;
  spin: number;
  fuse: number;
  fuseMax: number;
  moveAmp: number;
  movePhase: number;
  hue: number;
  gold: boolean;
  boss: boolean;
  ring: boolean;
  gapAngle: number;
  gapSpin: number;
};

export type Coin = { x: number; y: number; taken: boolean };
export type PowerKind = 'shield' | 'magnet';
export type PowerUp = { x: number; y: number; kind: PowerKind; taken: boolean };

export const isBossIndex = (idx: number, every: number = WORLD.bossEvery) => idx > 0 && idx % every === 0;

const angleDiff = (a: number, b: number) => {
  const d = (a - b) % (Math.PI * 2);
  return d > Math.PI ? d - Math.PI * 2 : d < -Math.PI ? d + Math.PI * 2 : d;
};

export const inGap = (p: Planet, x: number, y: number) => Math.abs(angleDiff(Math.atan2(y - p.y, x - p.x), p.gapAngle)) < WORLD.bossGapHalf;

export function makePlanet(rng: Rng, idx: number, prev: Planet | null, W: number, fuseBonus: number, rules: Rules = DEFAULT_RULES): Planet {
  const spin = (rng() < 0.5 ? -1 : 1) * (between(rng, 1.7, 2.3) + Math.min(idx * 0.04, 1.4));
  const base = { idx, spin, hue: planetHue(idx), movePhase: between(rng, 0, Math.PI * 2), gapAngle: 0, gapSpin: 0 };

  if (prev && isBossIndex(idx, rules.bossEvery)) {
    const r = WORLD.bossRadius;
    const x = W / 2;
    const fuseMax = 6 + fuseBonus;
    return {
      ...base, x, baseX: x, y: prev.y - 320, r, orbit: r + WORLD.bossOrbitPad, fuse: fuseMax, fuseMax, moveAmp: 0, gold: false,
      boss: true, ring: true, gapAngle: between(rng, 0, Math.PI * 2), gapSpin: (rng() < 0.5 ? -1 : 1) * between(rng, 0.9, 1.4),
    };
  }

  const r = idx === 0 ? 38 : between(rng, 24, 38);
  const orbit = r + 28;
  const margin = orbit + 14;
  const y = prev ? prev.y - between(rng, 230, 300) - (prev.boss ? 60 : 0) : 0;
  let x = prev ? between(rng, margin, W - margin) : W / 2;
  if (prev && Math.abs(x - prev.x) < 50) x = prev.x + (x < W / 2 ? 90 : -90);
  const fuseMax = (idx === 0 ? 6 : Math.max(1.8, 4.5 - idx * 0.07) * rules.fuseScale + fuseBonus) + (isBossIndex(idx + 1, rules.bossEvery) ? WORLD.preBossBreather : 0);
  const moveChance = rules.moveChance ?? Math.min(0.15 + idx * 0.01, 0.5);
  const moveAmp = idx >= rules.movingFrom && rng() < moveChance ? between(rng, 30, Math.min(W / 2 - margin, 90)) : 0;
  return { ...base, x, baseX: x, y, r, orbit, fuse: fuseMax, fuseMax, moveAmp, gold: idx > 3 && rng() < rules.goldChance, boss: false, ring: false };
}

export function pickupFor(rng: Rng, from: Planet, to: Planet, powerChance: number, rules: Rules = DEFAULT_RULES): { coin?: Coin; power?: PowerUp } {
  const dx = from.x - to.x;
  const dy = from.y - to.y;
  const d = Math.hypot(dx, dy);
  const off = to.orbit + 34;
  const at = { x: to.x + (dx / d) * off, y: to.y + (dy / d) * off };
  if (rules.powerups && to.idx > 4 && rng() < powerChance) return { power: { ...at, kind: rng() < 0.5 ? 'shield' : 'magnet', taken: false } };
  if (rng() < rules.coinChance) return { coin: { ...at, taken: false } };
  return {};
}
