import { currentPlanet, launchDir, State } from './engine';
import { TUNING } from './tuning';
import { planetX, WORLD } from './world';

/** How far inside the perfect zone the bot aims. */
const AIM = 0.8;
/** Share of a boss gap the bot trusts, normally and when its fuse is running out. */
const GAP_MARGIN = 0.65;
const HURRY_GAP_MARGIN = 0.9;
/** With this little fuse left, the bot settles for a normal landing and a wider part of the gap. */
const HURRY_FUSE = 1.2;
/** Stay clear of the very edge of a boss's capture circle. */
const RING_REACH = 0.85;

const angleBetween = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

/**
 * Decides, for the current frame, whether tapping now lands on the next planet, and perfectly.
 * It predicts where moving planets and spinning boss gaps will be when the ball arrives, and
 * threads a boss on whichever frame enters through its gap. It still dies now and then, mostly
 * when a boss gap never lines up before the fuse runs out. Dev autoplay only.
 */
export function botWantsTap(s: State): boolean {
  if (s.dead || s.flying) return false;
  const next = s.planets.find((p) => p.idx === s.cur + 1);
  if (!next) return false;
  const d = launchDir(s);
  const hurry = currentPlanet(s).fuse < HURRY_FUSE && s.fever <= 0;
  const reach = next.orbit + (s.fever > 0 ? TUNING.feverCaptureTolerance : TUNING.captureTolerance);

  // Flight time to the capture radius, refined for planets that move while the ball flies.
  let x = next.x;
  let flight = 0;
  for (let i = 0; i < 3; i++) {
    flight = Math.max(0, Math.hypot(x - s.bx, next.y - s.by) - reach) / TUNING.launchSpeed;
    x = planetX(next, s.t + flight);
  }
  const rx = x - s.bx;
  const ry = next.y - s.by;
  const along = rx * d.x + ry * d.y;
  if (along <= 0 || flight > TUNING.maxFlightTime * 0.9) return false;
  const off = Math.abs(d.x * ry - d.y * rx);
  if (off > reach) return false;

  if (next.ring) {
    // Each pass around the planet sweeps the entry point across half the ring, so for bosses
    // the bot takes whichever frame enters through the gap, perfect or not.
    if (off > reach * RING_REACH) return false;
    const back = Math.sqrt(reach * reach - off * off);
    const ex = s.bx + d.x * (along - back);
    const ey = s.by + d.y * (along - back);
    const gapAtEntry = next.gapAngle + next.gapSpin * ((along - back) / TUNING.launchSpeed);
    return angleBetween(Math.atan2(ey - next.y, ex - x), gapAtEntry) < WORLD.bossGapHalf * (hurry ? HURRY_GAP_MARGIN : GAP_MARGIN);
  }

  if (off < next.r * TUNING.perfectRatio * AIM) return true;
  return hurry && !s.rules.perfectOnly && off < next.r;
}
