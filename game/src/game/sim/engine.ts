import { MAX_TRACK, Track, TRACK_END } from './ghost';
import { C, hsl } from '../palette';
import { between, type Rng } from './rng';
import { Coin, DEFAULT_MODS, DEFAULT_RULES, inGap, makePlanet, Mods, pickupFor, Planet, PowerKind, PowerUp, Rules, zoneIndex, ZONES } from './world';

export { DEFAULT_MODS, DEFAULT_RULES, inGap, isBossIndex, WORLD, zoneIndex, zoneOf, ZONES } from './world';
export type { Coin, Mods, Planet, PowerKind, PowerUp, Rules } from './world';

export const TUNING = {
  launchSpeed: 780,
  captureTolerance: 12,
  feverCaptureTolerance: 30,
  perfectRatio: 0.55,
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
  maxParticles: 240,
  bossBonus: 10,
  bossCoins: 15,
  slowmoTime: 1.2,
  slowmoScale: 0.35,
} as const;

export type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number };
export type Popup = { x: number; y: number; text: string; life: number; color: string; coins?: boolean };

export type GameEvent = 'launch' | 'land' | 'perfect' | 'coin' | 'death' | 'milestone' | 'fever' | 'power' | 'saved' | 'best' | 'zone' | 'boss' | 'ghost';

export type DeathReason = 'lost' | 'collapse';

export type RunResult = { score: number; coins: number; perfects: number; bestCombo: number; planets: number; landings: Track; time: number; death: DeathReason | null };

export type State = {
  W: number;
  H: number;
  rng: Rng;
  fx: Rng;
  mods: Mods;
  rules: Rules;
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
  slowmo: number;
  bestIdx: number;
  zone: number;
  ghost: Track;
  ghostPtr: number;
  ghostIdx: number;
  ghostDone: boolean;
  ghostAhead: boolean;
  landings: Track;
  dead: boolean;
  deathReason: DeathReason | null;
  t: number;
  shake: number;
  shakeX: number;
  shakeY: number;
};

export const POWER_COLOR: Record<PowerKind, string> = { shield: C.cyan, magnet: C.pink };

export type CreateOptions = { bestIdx?: number; mods?: Mods; rules?: Rules; rng?: Rng; fx?: Rng; ghost?: Track; headStart?: number };

export function createState(W: number, H: number, { bestIdx = 0, mods = DEFAULT_MODS, rules = DEFAULT_RULES, rng = Math.random, fx = Math.random, ghost = [], headStart = 0 }: CreateOptions = {}): State {
  const first = makePlanet(rng, 0, null, W, 0, rules);
  const s: State = {
    W, H, rng, fx, mods, rules,
    planets: [first], coins: [], powerups: [], particles: [], popups: [], trail: [], events: [],
    cur: 0, ang: -Math.PI / 2, bx: 0, by: 0, vx: 0, vy: 0, flying: false, flyT: 0,
    camY: first.y - H * TUNING.cameraAnchor,
    score: 0, coinsRun: 0, perfects: 0, combo: 0, bestCombo: 0,
    fever: 0, magnet: 0, shield: mods.startShield && rules.powerups, slowmo: 0, bestIdx, zone: 0,
    ghost, ghostPtr: 0, ghostIdx: 0, ghostDone: ghost.length === 0, ghostAhead: false, landings: [],
    dead: false, deathReason: null, t: 0, shake: 0, shakeX: 0, shakeY: 0,
  };
  ensurePlanets(s);
  if (headStart > 0) jumpTo(s, headStart);
  orbit(s, currentPlanet(s));
  return s;
}

function jumpTo(s: State, idx: number) {
  s.cur = idx;
  ensurePlanets(s);
  s.camY = currentPlanet(s).y - s.H * TUNING.cameraAnchor;
  s.score = idx;
  s.zone = zoneIndex(idx);
  s.landings.push([0, idx]);
  ensurePlanets(s);
}

export const planetOf = (s: State, idx: number) => s.planets.find((p) => p.idx === idx)!;
export const currentPlanet = (s: State) => planetOf(s, s.cur);

export const launchDir = (s: State) => {
  const dir = Math.sign(currentPlanet(s).spin);
  return { x: -Math.sin(s.ang) * dir, y: Math.cos(s.ang) * dir };
};

export const runResult = (s: State): RunResult => ({ score: s.score, coins: s.coinsRun, perfects: s.perfects, bestCombo: s.bestCombo, planets: s.cur, landings: s.landings, time: s.t, death: s.deathReason });

export const isSettled = (s: State) => s.dead && s.particles.length === 0 && s.popups.length === 0;
export const ghostActive = (s: State) => !s.ghostDone;

export function retain<T>(arr: T[], keep: (x: T) => boolean) {
  let n = 0;
  for (let i = 0; i < arr.length; i++) if (keep(arr[i])) arr[n++] = arr[i];
  arr.length = n;
}

function ensurePlanets(s: State) {
  let last = s.planets[s.planets.length - 1];
  while (last.y > s.camY - s.H * 0.6 || last.idx < s.cur + TUNING.planetsAhead) {
    const p = makePlanet(s.rng, last.idx + 1, last, s.W, s.mods.fuseBonus, s.rules);
    const { coin, power } = pickupFor(s.rng, last, p, s.mods.powerChance, s.rules);
    if (coin) s.coins.push(coin);
    if (power) s.powerups.push(power);
    s.planets.push(p);
    last = p;
  }
  const cutoff = s.camY + s.H + 200;
  retain(s.planets, (p) => p.y < cutoff || p.idx === s.cur);
  retain(s.coins, (c) => c.y < cutoff && !c.taken);
  retain(s.powerups, (u) => u.y < cutoff && !u.taken);
}

function addCoins(s: State, n: number) {
  const gained = n * s.mods.coinMultiplier;
  s.coinsRun += gained;
  return gained;
}

function burst(s: State, x: number, y: number, color: string, n: number, speed = 220) {
  for (let i = 0; i < n; i++) {
    const a = s.fx() * Math.PI * 2;
    const v = between(s.fx, speed * 0.3, speed);
    const max = between(s.fx, 0.35, 0.7);
    s.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: max, max, color, size: between(s.fx, 3, 7) });
  }
  const extra = s.particles.length - TUNING.maxParticles;
  if (extra > 0) s.particles.splice(0, extra);
}

const popup = (s: State, x: number, y: number, text: string, color: string, life = 1, coins = false) => s.popups.push({ x, y, text, color, life, coins });
const banner = (s: State, screenY: number, text: string, color: string, life: number) => popup(s, s.W / 2, s.camY + s.H * screenY, text, color, life);

const record = (s: State, idx: number) => {
  if (s.landings.length < MAX_TRACK) s.landings.push([s.t, idx]);
};

function orbit(s: State, p: Planet) {
  s.bx = p.x + Math.cos(s.ang) * p.orbit;
  s.by = p.y + Math.sin(s.ang) * p.orbit;
}

function fail(s: State, reason: DeathReason) {
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
  record(s, TRACK_END);
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

function clearBoss(s: State, p: Planet) {
  p.ring = false;
  s.score += TUNING.bossBonus;
  const bossCoins = addCoins(s, TUNING.bossCoins);
  s.slowmo = TUNING.slowmoTime;
  s.shake = 14;
  banner(s, 0.32, 'BOSS CLEARED!', C.gold, 1.6);
  popup(s, p.x, p.y + p.orbit + 24, `+${TUNING.bossBonus} pts  +${bossCoins}`, C.gold, 1.4, true);
  burst(s, p.x, p.y, C.gold, 40, 380);
  burst(s, p.x, p.y, C.pink, 24, 300);
  s.events.push('boss');
}

const isPerfectApproach = (s: State, p: Planet) => Math.abs((s.vx * (p.y - s.by) - s.vy * (p.x - s.bx)) / TUNING.launchSpeed) < p.r * TUNING.perfectRatio;

function land(s: State, p: Planet) {
  const perfect = isPerfectApproach(s, p);
  const gained = p.idx - s.cur;
  const before = s.score;

  s.cur = p.idx;
  s.flying = false;
  s.ang = Math.atan2(s.by - p.y, s.bx - p.x);
  p.fuse = p.fuseMax;
  record(s, p.idx);

  if (p.ring) clearBoss(s, p);

  if (p.gold) {
    p.gold = false;
    popup(s, p.x, p.y + p.orbit + 20, `+${addCoins(s, TUNING.goldCoins)}`, C.gold, 1, true);
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
    s.shake = Math.max(s.shake, 5);
    s.events.push('perfect');
    if (s.combo % s.rules.feverEvery === 0) {
      s.fever = s.mods.feverTime + s.rules.feverBonus;
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

  if (ghostActive(s) && s.ghostAhead && s.cur > s.ghostIdx) {
    s.ghostAhead = false;
    banner(s, 0.22, 'PASSED YOUR GHOST', C.text, 1.3);
    s.events.push('ghost');
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
    s.shake = Math.max(s.shake, 9);
    s.events.push('milestone');
  }
}

function rejected(s: State, text: string) {
  popup(s, s.bx, s.by - 30, text, C.danger, 1);
  burst(s, s.bx, s.by, C.danger, 16, 260);
  fail(s, 'lost');
}

function fly(s: State, dt: number) {
  s.bx += s.vx * dt;
  s.by += s.vy * dt;
  s.flyT += dt;
  const tol = s.fever > 0 ? TUNING.feverCaptureTolerance : TUNING.captureTolerance;
  const target = s.planets.find((p) => p.idx > s.cur && Math.hypot(p.x - s.bx, p.y - s.by) < p.orbit + tol);
  if (target) {
    if (target.ring && !inGap(target, s.bx, s.by)) return rejected(s, 'BLOCKED!');
    if (s.rules.perfectOnly && !isPerfectApproach(s, target)) return rejected(s, 'NOT PERFECT!');
    return land(s, target);
  }
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
      const value = addCoins(s, s.fever > 0 ? 2 : 1);
      if (value > 1) popup(s, c.x, c.y - 20, `+${value}`, C.gold, 0.6, true);
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

function advanceGhost(s: State) {
  const g = s.ghost;
  while (s.ghostPtr < g.length && g[s.ghostPtr][0] <= s.t) {
    const idx = g[s.ghostPtr][1];
    if (idx !== TRACK_END) s.ghostIdx = idx;
    s.ghostPtr++;
  }
  if (s.ghostPtr >= g.length) s.ghostDone = true;
  if (!s.ghostDone && s.ghostIdx > s.cur) s.ghostAhead = true;
}

function tickEffects(s: State, dt: number) {
  s.shake = Math.max(0, s.shake - dt * 40);
  s.shakeX = s.shake ? (s.fx() - 0.5) * s.shake : 0;
  s.shakeY = s.shake ? (s.fx() - 0.5) * s.shake : 0;
  for (const q of s.particles) {
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.vx *= 0.94;
    q.vy *= 0.94;
    q.life -= dt;
  }
  retain(s.particles, (q) => q.life > 0);
  for (const u of s.popups) {
    u.y -= 50 * dt;
    u.life -= dt;
  }
  retain(s.popups, (u) => u.life > 0);
}

export function step(s: State, realDt: number) {
  const dt = s.slowmo > 0 ? realDt * TUNING.slowmoScale : realDt;
  s.slowmo = Math.max(0, s.slowmo - realDt);
  s.t += dt;
  for (const p of s.planets) {
    if (p.moveAmp) p.x = p.baseX + Math.sin(s.t * 1.3 + p.movePhase) * p.moveAmp;
    if (p.ring) p.gapAngle += p.gapSpin * dt;
  }
  tickEffects(s, dt);
  if (s.dead) return;

  advanceGhost(s);
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
