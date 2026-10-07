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

export const ZONES = [
  { name: 'DEEP SPACE', bg: '#0b1026' },
  { name: 'NEBULA', bg: '#1d0b2e' },
  { name: 'ICE FIELD', bg: '#06202b' },
  { name: 'INFERNO', bg: '#2a0b0b' },
  { name: 'EMERALD VOID', bg: '#04261a' },
  { name: 'THE BEYOND', bg: '#000000' },
];
export const zoneOf = (idx: number) => ZONES[Math.min(Math.floor(idx / 20), ZONES.length - 1)];
export type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number };
export type Popup = { x: number; y: number; text: string; life: number; color: string };

export type GameEvent = 'launch' | 'land' | 'perfect' | 'coin' | 'death' | 'milestone' | 'fever' | 'power' | 'saved' | 'best' | 'zone';

export type State = {
  W: number;
  H: number;
  planets: Planet[];
  coins: Coin[];
  particles: Particle[];
  popups: Popup[];
  trail: { x: number; y: number }[];
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
  dead: boolean;
  deathReason: 'lost' | 'collapse' | null;
  t: number;
  shake: number;
  events: GameEvent[];
  powerups: PowerUp[];
  fever: number;
  magnet: number;
  shield: boolean;
  bestIdx: number;
  zone: number;
};

export const FEVER_TIME = 6;
export const MAGNET_TIME = 8;

const SPEED = 780;
const rand = (a: number, b: number) => a + Math.random() * (b - a);

function makePlanet(idx: number, prev: Planet | null, W: number): Planet {
  const r = idx === 0 ? 38 : rand(24, 38);
  const orbit = r + 28;
  const margin = orbit + 14;
  const y = prev ? prev.y - rand(230, 300) : 0;
  let x = prev ? rand(margin, W - margin) : W / 2;
  if (prev && Math.abs(x - prev.x) < 50) x = prev.x + (x < W / 2 ? 90 : -90);
  const speedUp = Math.min(idx * 0.04, 1.4);
  const spin = (Math.random() < 0.5 ? -1 : 1) * (rand(1.7, 2.3) + speedUp);
  const fuseMax = idx === 0 ? 6 : Math.max(1.8, 4.5 - idx * 0.07);
  const moveAmp = idx > 12 && Math.random() < Math.min(0.15 + idx * 0.01, 0.5) ? rand(30, Math.min(W / 2 - margin, 90)) : 0;
  return {
    idx, x, baseX: x, y, r, orbit, spin, fuse: fuseMax, fuseMax,
    moveAmp, movePhase: rand(0, Math.PI * 2), hue: (idx * 37 + 200) % 360, gold: idx > 3 && Math.random() < 0.12,
  };
}

export function createState(W: number, H: number, bestIdx = 0): State {
  const first = makePlanet(0, null, W);
  const s: State = {
    W, H, planets: [first], coins: [], particles: [], popups: [], trail: [],
    cur: 0, ang: -Math.PI / 2, bx: 0, by: 0, vx: 0, vy: 0,
    flying: false, flyT: 0, camY: first.y - H * 0.65,
    score: 0, coinsRun: 0, perfects: 0, combo: 0, bestCombo: 0,
    dead: false, deathReason: null, t: 0, shake: 0, events: [],
    powerups: [], fever: 0, magnet: 0, shield: false, bestIdx, zone: 0,
  };
  ensurePlanets(s);
  return s;
}

function ensurePlanets(s: State) {
  let last = s.planets[s.planets.length - 1];
  while (last.y > s.camY - s.H * 0.6 || last.idx < s.cur + 4) {
    const p = makePlanet(last.idx + 1, last, s.W);
    const dx = last.x - p.x;
    const dy = last.y - p.y;
    const d = Math.hypot(dx, dy);
    const off = p.orbit + 34;
    const px = p.x + (dx / d) * off;
    const py = p.y + (dy / d) * off;
    if (p.idx > 4 && Math.random() < 0.1) s.powerups.push({ x: px, y: py, kind: Math.random() < 0.5 ? 'shield' : 'magnet', taken: false });
    else if (Math.random() < 0.65) s.coins.push({ x: px, y: py, taken: false });
    s.planets.push(p);
    last = p;
  }
  const cutoff = s.camY + s.H + 200;
  s.planets = s.planets.filter((p) => p.y < cutoff || p.idx === s.cur);
  s.coins = s.coins.filter((c) => c.y < cutoff && !c.taken);
  s.powerups = s.powerups.filter((u) => u.y < cutoff && !u.taken);
}

const planetOf = (s: State, idx: number) => s.planets.find((p) => p.idx === idx)!;

function burst(s: State, x: number, y: number, color: string, n: number, speed = 220) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = rand(speed * 0.3, speed);
    const max = rand(0.35, 0.7);
    s.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: max, max, color, size: rand(3, 7) });
  }
}

function die(s: State, reason: 'lost' | 'collapse') {
  if (s.shield) {
    const cur = planetOf(s, s.cur);
    s.shield = false;
    s.flying = false;
    s.combo = 0;
    cur.fuse = cur.fuseMax;
    s.ang = Math.atan2(s.by - cur.y, s.bx - cur.x);
    s.trail.length = 0;
    s.shake = 8;
    s.popups.push({ x: cur.x, y: cur.y - cur.orbit - 10, text: 'SAVED!', life: 1.1, color: '#4cc9f0' });
    burst(s, cur.x, cur.y, '#4cc9f0', 24, 280);
    s.events.push('saved');
    return;
  }
  s.dead = true;
  s.deathReason = reason;
  s.shake = 14;
  s.combo = 0;
  burst(s, s.bx, s.by, '#ff5d73', 26, 320);
  s.events.push('death');
}

export function tap(s: State) {
  if (s.dead || s.flying) return;
  const p = planetOf(s, s.cur);
  const dir = Math.sign(p.spin);
  s.vx = -Math.sin(s.ang) * dir * SPEED;
  s.vy = Math.cos(s.ang) * dir * SPEED;
  s.flying = true;
  s.flyT = 0;
  s.events.push('launch');
}

export function step(s: State, dt: number) {
  s.t += dt;
  s.shake = Math.max(0, s.shake - dt * 40);
  for (const p of s.planets) if (p.moveAmp) p.x = p.baseX + Math.sin(s.t * 1.3 + p.movePhase) * p.moveAmp;

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

  if (s.dead) return;
  s.fever = Math.max(0, s.fever - dt);
  s.magnet = Math.max(0, s.magnet - dt);

  const cur = planetOf(s, s.cur);
  if (!s.flying) {
    s.ang += cur.spin * dt;
    s.bx = cur.x + Math.cos(s.ang) * cur.orbit;
    s.by = cur.y + Math.sin(s.ang) * cur.orbit;
    if (s.fever <= 0) cur.fuse -= dt;
    if (cur.fuse <= 0) {
      burst(s, cur.x, cur.y, `hsl(${cur.hue},80%,60%)`, 30, 260);
      die(s, 'collapse');
    }
  } else {
    s.bx += s.vx * dt;
    s.by += s.vy * dt;
    s.flyT += dt;
    const tol = s.fever > 0 ? 30 : 12;


    for (const p of s.planets) {
      if (p.idx <= s.cur) continue;
      const dx = p.x - s.bx;
      const dy = p.y - s.by;
      if (Math.hypot(dx, dy) < p.orbit + tol) {
        const closest = Math.abs((s.vx * dy - s.vy * dx) / SPEED);
        const perfect = closest < p.r * 0.55;
        const gained = p.idx - s.cur;
        s.cur = p.idx;
        s.flying = false;
        s.ang = Math.atan2(s.by - p.y, s.bx - p.x);
        p.fuse = p.fuseMax;
        const before = s.score;
        if (p.gold) {
          s.coinsRun += 5;
          s.popups.push({ x: p.x, y: p.y + p.orbit + 20, text: '+5 ●', life: 1, color: '#ffd34d' });
          burst(s, p.x, p.y, '#ffd34d', 20, 260);
          p.gold = false;
          s.events.push('coin');
        }
        if (perfect) {
          s.combo += 1;
          s.perfects += 1;
          s.bestCombo = Math.max(s.bestCombo, s.combo);
          s.score += gained + s.combo;
          s.popups.push({ x: p.x, y: p.y - p.orbit - 10, text: `PERFECT +${gained + s.combo}`, life: 0.9, color: '#7dffb2' });
          burst(s, s.bx, s.by, '#7dffb2', 14, 240);
          s.shake = 5;
          s.events.push('perfect');
          if (s.combo % 5 === 0) {
            s.fever = FEVER_TIME;
            s.shake = 12;
            s.popups.push({ x: s.W / 2, y: s.camY + s.H * 0.42, text: 'FEVER!', life: 1.3, color: '#ff70a6' });
            burst(s, s.bx, s.by, '#ff70a6', 30, 340);
            s.events.push('fever');
          }
        } else {
          s.combo = 0;
          s.score += gained;
          burst(s, s.bx, s.by, `hsl(${p.hue},80%,65%)`, 8, 160);
          s.events.push('land');
        }
        if (s.bestIdx > 0 && p.idx >= s.bestIdx) {
          s.bestIdx = -1;
          s.popups.push({ x: s.W / 2, y: s.camY + s.H * 0.28, text: 'NEW BEST!', life: 1.4, color: '#ffd34d' });
          burst(s, s.bx, s.by, '#ffd34d', 30, 340);
          s.events.push('best');
        }
        const z = Math.min(Math.floor(p.idx / 20), ZONES.length - 1);
        if (z > s.zone) {
          s.zone = z;
          s.popups.push({ x: s.W / 2, y: s.camY + s.H * 0.5, text: `ZONE ${z + 1}: ${ZONES[z].name}`, life: 1.8, color: '#9ad7ff' });
          s.events.push('zone');
        }
        const m = Math.floor(s.score / 25);
        if (m > Math.floor(before / 25)) {
          s.popups.push({ x: s.W / 2, y: s.camY + s.H * 0.35, text: `${m * 25}!`, life: 1.2, color: '#ffffff' });
          s.shake = 9;
          s.events.push('milestone');
        }
        break;
      }
    }

    if (s.flying && (s.bx < -30 || s.bx > s.W + 30 || s.by - s.camY > s.H + 30 || s.flyT > 1.8)) die(s, 'lost');
  }

  collectPickups(s, dt);

  s.trail.push({ x: s.bx, y: s.by });
  if (s.trail.length > 12) s.trail.shift();

  const target = planetOf(s, s.cur).y - s.H * 0.65;
  s.camY += (target - s.camY) * Math.min(1, dt * 4);
  ensurePlanets(s);
}

function collectPickups(s: State, dt: number) {
  if (s.dead) return;
  for (const c of s.coins) {
    if (c.taken) continue;
    const d = Math.hypot(c.x - s.bx, c.y - s.by);
    if (s.magnet > 0 && d < 190 && d > 1) {
      const pull = Math.min(d, 650 * dt);
      c.x += ((s.bx - c.x) / d) * pull;
      c.y += ((s.by - c.y) / d) * pull;
    }
    if (d < 26) {
      c.taken = true;
      const v = s.fever > 0 ? 2 : 1;
      s.coinsRun += v;
      if (v > 1) s.popups.push({ x: c.x, y: c.y - 20, text: '+2', life: 0.6, color: '#ffd34d' });
      burst(s, c.x, c.y, '#ffd34d', 8, 160);
      s.events.push('coin');
    }
  }
  for (const u of s.powerups) {
    if (u.taken || Math.hypot(u.x - s.bx, u.y - s.by) > 32) continue;
    u.taken = true;
    if (u.kind === 'shield') s.shield = true;
    else s.magnet = MAGNET_TIME;
    const color = u.kind === 'shield' ? '#4cc9f0' : '#ff70a6';
    s.popups.push({ x: u.x, y: u.y - 24, text: u.kind === 'shield' ? 'SHIELD' : 'MAGNET', life: 1, color });
    burst(s, u.x, u.y, color, 18, 240);
    s.events.push('power');
  }
}
