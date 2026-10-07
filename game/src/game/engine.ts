import { C, hsl, planetHue } from './palette';
import { between, type Rng } from './rng';
import { DEFAULT_MODS, type Mods } from './upgrades';

export const TUNING = {
  launchSpeed: 780,
  captureTolerance: 12,
  feverCaptureTolerance: 30,
  perfectRatio: 0.55,
  feverEveryCombo: 5,
  maxFlightTime: 1.8,
  offscreenMargin: 30,
  planetsAhead: 4,
  cameraAnchor: 0.65,
  cameraFollow: 4,
  trailLength: 18,
  trailSpacing: 10,
  coinRadius: 26,
  powerRadius: 32,
  magnetRange: 190,
  magnetPull: 650,
  goldCoins: 5,
  milestoneEvery: 25,
  planetsPerZone: 20,
  maxParticles: 240,
} as const;

export const ZONES = [
  { name: 'DEEP SPACE', bg: '#0b1026' },
  { name: 'NEBULA', bg: '#1d0b2e' },
  { name: 'ICE FIELD', bg: '#06202b' },
  { name: 'INFERNO', bg: '#2a0b0b' },
  { name: 'EMERALD VOID', bg: '#04261a' },
  { name: 'THE BEYOND', bg: '#000000' },
];

export const zoneIndex = (planetIdx: number) => Math.min(Math.floor(planetIdx / TUNING.planetsPerZone), ZONES.length - 1);
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
};

export type Coin = { x: number; y: number; taken: boolean };
export type PowerKind = 'shield' | 'magnet';
export type PowerUp = { x: number; y: number; kind: PowerKind; taken: boolean };
export type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number };
export type Popup = { x: number; y: number; text: string; life: number; color: string };

export type GameEvent = 'launch' | 'land' | 'perfect' | 'coin' | 'death' | 'milestone' | 'fever' | 'power' | 'saved' | 'best' | 'zone';

export type RunResult = { score: number; coins: number; perfects: number; bestCombo: number; planets: number };

export type State = {
  W: number;
  H: number;
  rng: Rng;
  mods: Mods;
  planets: Planet[];
  coins: Coin[];
  powerups: PowerUp[];
  particles: Particle[];
  popups: Popup[];
  trail: { x: number; y: number }[];
  events: GameEvent[];
  cur: number;
  ang: number;
  bx: number;
  by: number;
  vx: number;
  vy: number;
  flying: boolean;
  flyT: number;
  camY: number;
  score: number;
  coinsRun: number;
  perfects: number;
  combo: number;
  bestCombo: number;
  fever: number;
  magnet: number;
  shield: boolean;
  bestIdx: number;
  zone: number;
  dead: boolean;
  deathReason: 'lost' | 'collapse' | null;
  t: number;
  shake: number;
  shakeX: number;
  shakeY: number;
};

export const POWER_COLOR: Record<PowerKind, string> = { shield: C.cyan, magnet: C.pink };

function makePlanet(rng: Rng, idx: number, prev: Planet | null, W: number, fuseBonus: number): Planet {
  const r = idx === 0 ? 38 : between(rng, 24, 38);
  const orbit = r + 28;
  const margin = orbit + 14;
  const y = prev ? prev.y - between(rng, 230, 300) : 0;
  let x = prev ? between(rng, margin, W - margin) : W / 2;
  if (prev && Math.abs(x - prev.x) < 50) x = prev.x + (x < W / 2 ? 90 : -90);
  const spin = (rng() < 0.5 ? -1 : 1) * (between(rng, 1.7, 2.3) + Math.min(idx * 0.04, 1.4));
  const fuseMax = idx === 0 ? 6 : Math.max(1.8, 4.5 - idx * 0.07) + fuseBonus;
  const moveAmp = idx > 12 && rng() < Math.min(0.15 + idx * 0.01, 0.5) ? between(rng, 30, Math.min(W / 2 - margin, 90)) : 0;
  return { idx, x, baseX: x, y, r, orbit, spin, fuse: fuseMax, fuseMax, moveAmp, movePhase: between(rng, 0, Math.PI * 2), hue: planetHue(idx), gold: idx > 3 && rng() < 0.12 };
}

export type CreateOptions = { bestIdx?: number; mods?: Mods; rng?: Rng };

export function createState(W: number, H: number, { bestIdx = 0, mods = DEFAULT_MODS, rng = Math.random }: CreateOptions = {}): State {
  const first = makePlanet(rng, 0, null, W, 0);
  const s: State = {
    W, H, rng, mods,
    planets: [first], coins: [], powerups: [], particles: [], popups: [], trail: [], events: [],
    cur: 0, ang: -Math.PI / 2, bx: 0, by: 0, vx: 0, vy: 0, flying: false, flyT: 0,
    camY: first.y - H * TUNING.cameraAnchor,
    score: 0, coinsRun: 0, perfects: 0, combo: 0, bestCombo: 0,
    fever: 0, magnet: 0, shield: mods.startShield, bestIdx, zone: 0,
    dead: false, deathReason: null, t: 0, shake: 0, shakeX: 0, shakeY: 0,
  };
  ensurePlanets(s);
  orbit(s, planetOf(s, 0));
  return s;
}

export const planetOf = (s: State, idx: number) => s.planets.find((p) => p.idx === idx)!;
export const currentPlanet = (s: State) => planetOf(s, s.cur);

export const launchDir = (s: State) => {
  const dir = Math.sign(currentPlanet(s).spin);
  return { x: -Math.sin(s.ang) * dir, y: Math.cos(s.ang) * dir };
};

export const runResult = (s: State): RunResult => ({ score: s.score, coins: s.coinsRun, perfects: s.perfects, bestCombo: s.bestCombo, planets: s.cur });

export const isSettled = (s: State) => s.dead && s.particles.length === 0 && s.popups.length === 0;

function ensurePlanets(s: State) {
  let last = s.planets[s.planets.length - 1];
  while (last.y > s.camY - s.H * 0.6 || last.idx < s.cur + TUNING.planetsAhead) {
    const p = makePlanet(s.rng, last.idx + 1, last, s.W, s.mods.fuseBonus);
    const dx = last.x - p.x;
    const dy = last.y - p.y;
    const d = Math.hypot(dx, dy);
    const off = p.orbit + 34;
    const at = { x: p.x + (dx / d) * off, y: p.y + (dy / d) * off };
    if (p.idx > 4 && s.rng() < s.mods.powerChance) s.powerups.push({ ...at, kind: s.rng() < 0.5 ? 'shield' : 'magnet', taken: false });
    else if (s.rng() < 0.65) s.coins.push({ ...at, taken: false });
    s.planets.push(p);
    last = p;
  }
  const cutoff = s.camY + s.H + 200;
  s.planets = s.planets.filter((p) => p.y < cutoff || p.idx === s.cur);
  s.coins = s.coins.filter((c) => c.y < cutoff && !c.taken);
  s.powerups = s.powerups.filter((u) => u.y < cutoff && !u.taken);
}

function burst(s: State, x: number, y: number, color: string, n: number, speed = 220) {
  for (let i = 0; i < n; i++) {
    const a = s.rng() * Math.PI * 2;
    const v = between(s.rng, speed * 0.3, speed);
    const max = between(s.rng, 0.35, 0.7);
    s.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: max, max, color, size: between(s.rng, 3, 7) });
  }
  const extra = s.particles.length - TUNING.maxParticles;
  if (extra > 0) s.particles.splice(0, extra);
}

const popup = (s: State, x: number, y: number, text: string, color: string, life = 1) => s.popups.push({ x, y, text, color, life });
const banner = (s: State, screenY: number, text: string, color: string, life: number) => popup(s, s.W / 2, s.camY + s.H * screenY, text, color, life);

function orbit(s: State, p: Planet) {
  s.bx = p.x + Math.cos(s.ang) * p.orbit;
  s.by = p.y + Math.sin(s.ang) * p.orbit;
}

function fail(s: State, reason: 'lost' | 'collapse') {
  if (s.shield) {
    const cur = currentPlanet(s);
    s.shield = false;
    s.flying = false;
    s.combo = 0;
    cur.fuse = cur.fuseMax;
    s.ang = Math.atan2(s.by - cur.y, s.bx - cur.x);
    orbit(s, cur);
    s.trail.length = 0;
    s.shake = 8;
    popup(s, cur.x, cur.y - cur.orbit - 10, 'SAVED!', C.cyan, 1.1);
    burst(s, cur.x, cur.y, C.cyan, 24, 280);
    s.events.push('saved');
    return;
  }
  s.dead = true;
  s.deathReason = reason;
  s.shake = 14;
  s.combo = 0;
  burst(s, s.bx, s.by, C.danger, 26, 320);
  s.events.push('death');
}

export function tap(s: State) {
  if (s.dead || s.flying) return;
  const d = launchDir(s);
  s.vx = d.x * TUNING.launchSpeed;
  s.vy = d.y * TUNING.launchSpeed;
  s.flying = true;
  s.flyT = 0;
  s.events.push('launch');
}

function land(s: State, p: Planet) {
  const dx = p.x - s.bx;
  const dy = p.y - s.by;
  const perfect = Math.abs((s.vx * dy - s.vy * dx) / TUNING.launchSpeed) < p.r * TUNING.perfectRatio;
  const gained = p.idx - s.cur;
  const before = s.score;

  s.cur = p.idx;
  s.flying = false;
  s.ang = Math.atan2(s.by - p.y, s.bx - p.x);
  p.fuse = p.fuseMax;

  if (p.gold) {
    p.gold = false;
    s.coinsRun += TUNING.goldCoins;
    popup(s, p.x, p.y + p.orbit + 20, `+${TUNING.goldCoins} ●`, C.gold);
    burst(s, p.x, p.y, C.gold, 20, 260);
    s.events.push('coin');
  }

  if (perfect) {
    s.combo += 1;
    s.perfects += 1;
    s.bestCombo = Math.max(s.bestCombo, s.combo);
    s.score += gained + s.combo;
    popup(s, p.x, p.y - p.orbit - 10, `PERFECT +${gained + s.combo}`, C.mint, 0.9);
    burst(s, s.bx, s.by, C.mint, 14, 240);
    s.shake = 5;
    s.events.push('perfect');
    if (s.combo % TUNING.feverEveryCombo === 0) {
      s.fever = s.mods.feverTime;
      s.shake = 12;
      banner(s, 0.42, 'FEVER!', C.pink, 1.3);
      burst(s, s.bx, s.by, C.pink, 30, 340);
      s.events.push('fever');
    }
  } else {
    s.combo = 0;
    s.score += gained;
    burst(s, s.bx, s.by, hsl(p.hue, 80, 65), 8, 160);
    s.events.push('land');
  }

  if (s.bestIdx > 0 && p.idx >= s.bestIdx) {
    s.bestIdx = -1;
    banner(s, 0.28, 'NEW BEST!', C.gold, 1.4);
    burst(s, s.bx, s.by, C.gold, 30, 340);
    s.events.push('best');
  }

  const z = zoneIndex(p.idx);
  if (z > s.zone) {
    s.zone = z;
    banner(s, 0.5, `ZONE ${z + 1}: ${ZONES[z].name}`, C.sky, 1.8);
    s.events.push('zone');
  }

  const m = Math.floor(s.score / TUNING.milestoneEvery);
  if (m > Math.floor(before / TUNING.milestoneEvery)) {
    banner(s, 0.35, `${m * TUNING.milestoneEvery}!`, C.text, 1.2);
    s.shake = 9;
    s.events.push('milestone');
  }
}

function fly(s: State, dt: number) {
  s.bx += s.vx * dt;
  s.by += s.vy * dt;
  s.flyT += dt;
  const tol = s.fever > 0 ? TUNING.feverCaptureTolerance : TUNING.captureTolerance;
  const target = s.planets.find((p) => p.idx > s.cur && Math.hypot(p.x - s.bx, p.y - s.by) < p.orbit + tol);
  if (target) return land(s, target);
  const m = TUNING.offscreenMargin;
  if (s.bx < -m || s.bx > s.W + m || s.by - s.camY > s.H + m || s.flyT > TUNING.maxFlightTime) fail(s, 'lost');
}

function hold(s: State, dt: number) {
  const cur = currentPlanet(s);
  s.ang += cur.spin * dt;
  orbit(s, cur);
  if (s.fever <= 0) cur.fuse -= dt;
  if (cur.fuse <= 0) {
    burst(s, cur.x, cur.y, hsl(cur.hue, 80, 60), 30, 260);
    fail(s, 'collapse');
  }
}

function collectPickups(s: State, dt: number) {
  for (const c of s.coins) {
    if (c.taken) continue;
    const d = Math.hypot(c.x - s.bx, c.y - s.by);
    if (s.magnet > 0 && d < TUNING.magnetRange && d > 1) {
      const pull = Math.min(d, TUNING.magnetPull * dt);
      c.x += ((s.bx - c.x) / d) * pull;
      c.y += ((s.by - c.y) / d) * pull;
    }
    if (d < TUNING.coinRadius) {
      c.taken = true;
      const value = s.fever > 0 ? 2 : 1;
      s.coinsRun += value;
      if (value > 1) popup(s, c.x, c.y - 20, `+${value}`, C.gold, 0.6);
      burst(s, c.x, c.y, C.gold, 8, 160);
      s.events.push('coin');
    }
  }
  for (const u of s.powerups) {
    if (u.taken || Math.hypot(u.x - s.bx, u.y - s.by) > TUNING.powerRadius) continue;
    u.taken = true;
    if (u.kind === 'shield') s.shield = true;
    else s.magnet = s.mods.magnetTime;
    popup(s, u.x, u.y - 24, u.kind.toUpperCase(), POWER_COLOR[u.kind]);
    burst(s, u.x, u.y, POWER_COLOR[u.kind], 18, 240);
    s.events.push('power');
  }
}

function extendTrail(s: State) {
  const last = s.trail[s.trail.length - 1];
  if (!last) {
    s.trail.push({ x: s.bx, y: s.by });
    return;
  }
  const d = Math.hypot(s.bx - last.x, s.by - last.y);
  const n = Math.min(Math.floor(d / TUNING.trailSpacing), TUNING.trailLength);
  for (let i = 1; i <= n; i++) {
    const k = (i * TUNING.trailSpacing) / d;
    s.trail.push({ x: last.x + (s.bx - last.x) * k, y: last.y + (s.by - last.y) * k });
  }
  if (s.trail.length > TUNING.trailLength) s.trail.splice(0, s.trail.length - TUNING.trailLength);
}

function tickEffects(s: State, dt: number) {
  s.shake = Math.max(0, s.shake - dt * 40);
  s.shakeX = s.shake ? (s.rng() - 0.5) * s.shake : 0;
  s.shakeY = s.shake ? (s.rng() - 0.5) * s.shake : 0;
  for (const q of s.particles) {
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.vx *= 0.94;
    q.vy *= 0.94;
    q.life -= dt;
  }
  s.particles = s.particles.filter((q) => q.life > 0);
  for (const u of s.popups) {
    u.y -= 50 * dt;
    u.life -= dt;
  }
  s.popups = s.popups.filter((u) => u.life > 0);
}

export function step(s: State, dt: number) {
  s.t += dt;
  for (const p of s.planets) if (p.moveAmp) p.x = p.baseX + Math.sin(s.t * 1.3 + p.movePhase) * p.moveAmp;
  tickEffects(s, dt);
  if (s.dead) return;

  s.fever = Math.max(0, s.fever - dt);
  s.magnet = Math.max(0, s.magnet - dt);
  if (s.flying) fly(s, dt);
  else hold(s, dt);
  if (s.dead) return;

  collectPickups(s, dt);
  extendTrail(s);

  const target = currentPlanet(s).y - s.H * TUNING.cameraAnchor;
  s.camY += (target - s.camY) * Math.min(1, dt * TUNING.cameraFollow);
  ensurePlanets(s);
}
