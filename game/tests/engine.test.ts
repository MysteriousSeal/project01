import { describe, expect, it } from '@jest/globals';
import { currentPlanet, isSettled, launchDir, planetOf, runResult, State, step, tap, TUNING, zoneIndex } from '../src/game/engine';
import { seededRng } from '../src/game/rng';
import { modsFrom } from '../src/game/upgrades';
import { aimAt, DT, flyUntilSettled, hop, newGame, runFor } from './helpers';

const eventsOf = (s: State) => {
  const out = [...s.events];
  s.events.length = 0;
  return out;
};

describe('createState', () => {
  it('starts orbiting a centered first planet with planets generated ahead', () => {
    const s = newGame();
    const p0 = currentPlanet(s);
    expect(p0.idx).toBe(0);
    expect(p0.x).toBe(195);
    expect(Math.hypot(s.bx - p0.x, s.by - p0.y)).toBeCloseTo(p0.orbit);
    expect(Math.max(...s.planets.map((p) => p.idx))).toBeGreaterThanOrEqual(TUNING.planetsAhead);
  });

  it('is deterministic for a given seed', () => {
    const a = newGame(42).planets.map((p) => [p.x, p.y, p.spin]);
    const b = newGame(42).planets.map((p) => [p.x, p.y, p.spin]);
    const c = newGame(43).planets.map((p) => [p.x, p.y, p.spin]);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('applies upgrade mods', () => {
    const base = newGame(7);
    const boosted = newGame(7, { mods: modsFrom({ sturdy: 2, shield: 1 }) });
    expect(boosted.shield).toBe(true);
    expect(base.shield).toBe(false);
    expect(planetOf(boosted, 1).fuseMax - planetOf(base, 1).fuseMax).toBeCloseTo(0.6);
    expect(planetOf(boosted, 0).fuseMax).toBe(planetOf(base, 0).fuseMax);
  });
});

describe('tap', () => {
  it('launches along the orbit tangent at launch speed, once', () => {
    const s = newGame();
    const d = launchDir(s);
    tap(s);
    expect(s.flying).toBe(true);
    expect(Math.hypot(s.vx, s.vy)).toBeCloseTo(TUNING.launchSpeed);
    expect(s.vx / TUNING.launchSpeed).toBeCloseTo(d.x);
    expect(eventsOf(s)).toEqual(['launch']);
    const before = { vx: s.vx, vy: s.vy };
    tap(s);
    expect({ vx: s.vx, vy: s.vy }).toEqual(before);
    expect(eventsOf(s)).toEqual([]);
  });
});

describe('landing', () => {
  it('scores a perfect with combo bonus when aimed at the center', () => {
    const s = newGame();
    hop(s);
    expect(s.flying).toBe(false);
    expect(s.cur).toBe(1);
    expect(s.perfects).toBe(1);
    expect(s.combo).toBe(1);
    expect(s.score).toBe(2);
    expect(eventsOf(s)).toContain('perfect');
    expect(currentPlanet(s).fuse).toBe(currentPlanet(s).fuseMax);
  });

  it('scores a plain landing and resets combo when off-center', () => {
    const s = newGame();
    hop(s);
    const n = planetOf(s, 2);
    hop(s, n.r * 0.9);
    expect(s.cur).toBe(2);
    expect(s.combo).toBe(0);
    expect(s.score).toBe(3);
  });

  it('starts fever on every fifth consecutive perfect', () => {
    const s = newGame(3);
    for (let i = 0; i < TUNING.feverEveryCombo - 1; i++) hop(s);
    expect(s.fever).toBe(0);
    eventsOf(s);
    hop(s);
    expect(eventsOf(s)).toContain('fever');
    expect(s.fever).toBeCloseTo(s.mods.feverTime, 1);
    const fuse = currentPlanet(s).fuse;
    runFor(s, 1);
    expect(currentPlanet(s).fuse).toBe(fuse);
  });

  it('always keeps planets ahead even when hopping faster than the camera', () => {
    const s = newGame(9);
    for (let i = 0; i < 40; i++) {
      expect(s.planets.some((p) => p.idx === s.cur + 1)).toBe(true);
      hop(s);
      expect(s.dead).toBe(false);
    }
    expect(s.cur).toBe(40);
  });

  it('announces a new best once when passing the previous record', () => {
    const s = newGame(5, { bestIdx: 2 });
    hop(s);
    expect(eventsOf(s)).not.toContain('best');
    hop(s);
    expect(eventsOf(s)).toContain('best');
    expect(s.bestIdx).toBe(-1);
    hop(s);
    expect(eventsOf(s)).not.toContain('best');
  });

  it('enters a new zone every planetsPerZone planets', () => {
    const s = newGame(11);
    let zoneEvents = 0;
    for (let i = 0; i < TUNING.planetsPerZone; i++) {
      hop(s);
      zoneEvents += eventsOf(s).filter((e) => e === 'zone').length;
    }
    expect(zoneEvents).toBe(1);
    expect(s.zone).toBe(zoneIndex(TUNING.planetsPerZone));
  });
});

describe('failure', () => {
  it('dies when the ball flies off screen', () => {
    const s = newGame();
    s.flying = true;
    s.vx = TUNING.launchSpeed;
    s.vy = 0;
    s.bx = 300;
    s.by = currentPlanet(s).y + 200;
    flyUntilSettled(s);
    expect(s.dead).toBe(true);
    expect(s.deathReason).toBe('lost');
    expect(eventsOf(s)).toContain('death');
  });

  it('dies when the planet collapses', () => {
    const s = newGame();
    runFor(s, currentPlanet(s).fuseMax + 0.1);
    expect(s.dead).toBe(true);
    expect(s.deathReason).toBe('collapse');
  });

  it('a shield absorbs one death and returns the ball to its orbit', () => {
    const s = newGame();
    s.shield = true;
    const p = currentPlanet(s);
    runFor(s, p.fuseMax + 0.1);
    expect(s.dead).toBe(false);
    expect(s.shield).toBe(false);
    expect(eventsOf(s)).toContain('saved');
    expect(Math.hypot(s.bx - p.x, s.by - p.y)).toBeCloseTo(p.orbit);
    runFor(s, p.fuseMax + 0.1);
    expect(s.dead).toBe(true);
  });

  it('settles after death so the render loop can stop', () => {
    const s = newGame();
    runFor(s, 7);
    expect(s.dead).toBe(true);
    for (let i = 0; i < 400; i++) step(s, DT);
    expect(isSettled(s)).toBe(true);
  });
});

describe('pickups', () => {
  it('collects coins, doubled during fever', () => {
    const s = newGame();
    s.coins = [{ x: s.bx, y: s.by, taken: false }];
    step(s, DT);
    expect(s.coinsRun).toBe(1);
    s.fever = 3;
    s.coins = [{ x: s.bx, y: s.by, taken: false }];
    step(s, DT);
    expect(s.coinsRun).toBe(3);
  });

  it('magnet pulls nearby coins in', () => {
    const s = newGame();
    s.magnet = 5;
    s.coins = [{ x: s.bx + 150, y: s.by, taken: false }];
    runFor(s, 0.5);
    expect(s.coinsRun).toBe(1);
  });

  it('power-ups grant shield and magnet', () => {
    const s = newGame();
    s.powerups = [{ x: s.bx, y: s.by, kind: 'shield', taken: false }, { x: s.bx, y: s.by, kind: 'magnet', taken: false }];
    step(s, DT);
    expect(s.shield).toBe(true);
    expect(s.magnet).toBeCloseTo(s.mods.magnetTime, 1);
  });
});

describe('simulation', () => {
  it('plays many seeded games to completion without errors', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const s = newGame(seed);
      const bot = seededRng(seed + 1000);
      let guard = 0;
      while (!s.dead && guard++ < 60 * 300) {
        if (!s.flying) {
          const n = planetOf(s, s.cur + 1);
          const d = launchDir(s);
          const dx = n.x - s.bx;
          const dy = n.y - s.by;
          if (d.x * dx + d.y * dy > 0 && Math.abs(d.x * dy - d.y * dx) < n.r * (bot() < 0.9 ? 0.5 : 3) && bot() < 0.3) tap(s);
        }
        step(s, 1 / 60);
        s.events.length = 0;
      }
      expect(s.dead).toBe(true);
      const r = runResult(s);
      expect(r.planets).toBe(s.cur);
      expect(r.score).toBeGreaterThanOrEqual(r.planets);
      expect(s.particles.length).toBeLessThanOrEqual(TUNING.maxParticles);
    }
  });
});

describe('aimAt helper sanity', () => {
  it('places the ball below the target planet', () => {
    const s = newGame();
    aimAt(s, 1);
    expect(s.by).toBeGreaterThan(planetOf(s, 1).y);
  });
});
