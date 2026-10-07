import { createState, CreateOptions, planetOf, State, step, TUNING } from '../src/game/engine';
import { seededRng } from '../src/game/rng';
import { defaultSave, Save } from '../src/game/save';

export const W = 390;
export const H = 844;
export const DT = 1 / 120;

export const newGame = (seed = 1, opts: Omit<CreateOptions, 'rng'> = {}) => createState(W, H, { ...opts, rng: seededRng(seed) });

export const FROM_BELOW = Math.PI / 2;

export function aimAt(s: State, idx: number, offsetX = 0, openGap = true) {
  const n = planetOf(s, idx);
  if (n.ring && openGap) n.gapAngle = FROM_BELOW;
  s.flying = true;
  s.flyT = 0;
  s.bx = n.x + offsetX;
  s.by = n.y + n.orbit + 30;
  s.vx = 0;
  s.vy = -TUNING.launchSpeed;
}

export function flyUntilSettled(s: State, maxSteps = 240) {
  for (let i = 0; i < maxSteps && s.flying && !s.dead; i++) step(s, DT);
}

export function hop(s: State, offsetX = 0, openGap = true) {
  const target = s.cur + 1;
  aimAt(s, target, offsetX, openGap);
  flyUntilSettled(s);
  return target;
}

export const runFor = (s: State, seconds: number) => {
  for (let t = 0; t < seconds && !s.dead; t += DT) step(s, DT);
};

export const saveWith = (patch: Partial<Save> = {}): Save => ({ ...defaultSave(), ...patch });
