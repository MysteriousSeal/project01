import { between } from './rng';
import type { State } from './engine';
import { retain } from './retain';
import { TUNING } from './tuning';

/** Visual-only state: particles, floating text and the ball's trail. Nothing here affects scoring. */
export type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number };
export type Popup = { x: number; y: number; text: string; life: number; color: string; coins?: boolean };

export function burst(s: State, x: number, y: number, color: string, n: number, speed = 220) {
  for (let i = 0; i < n; i++) {
    const a = s.fx() * Math.PI * 2;
    const v = between(s.fx, speed * 0.3, speed);
    const max = between(s.fx, 0.35, 0.7);
    s.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: max, max, color, size: between(s.fx, 3, 7) });
  }
  const extra = s.particles.length - TUNING.maxParticles;
  if (extra > 0) s.particles.splice(0, extra);
}

export const popup = (s: State, x: number, y: number, text: string, color: string, life = 1, coins = false) => s.popups.push({ x, y, text, color, life, coins });
export const banner = (s: State, screenY: number, text: string, color: string, life: number) => popup(s, s.W / 2, s.camY + s.H * screenY, text, color, life);

export function extendTrail(s: State) {
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

export function tickEffects(s: State, dt: number) {
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
