import { describe, expect, it } from '@jest/globals';
import { existsSync } from 'fs';
import { join } from 'path';
import { diffLedger } from '../../src/game/meta/ledger';
import { MAX_REVIVES, REVIVE_PRICES, reviveOffer } from '../../src/game/meta/revive';
import { currentPlanet, revive, runResult, step } from '../../src/game/sim/engine';
import { TRACK_END } from '../../src/game/sim/ghost';
import { PERFECT_NOTES, perfectSound, soundForEvent, SOURCES } from '../../src/services/device/soundMap';
import { EndFlow } from '../../src/ui/screens/game/endFlow';
import { drain, hop, newGame, runFor, saveWith } from '../helpers';

describe('revive offers', () => {
  it('rise in price and stop after the last revive', () => {
    expect(reviveOffer('normal', 0, 1000)).toBe(REVIVE_PRICES[0]);
    expect(reviveOffer('normal', 1, 1000)).toBe(REVIVE_PRICES[1]);
    expect(reviveOffer('normal', MAX_REVIVES, 1000)).toBeNull();
  });

  it('are skipped when the wallet is short and in daily challenges', () => {
    expect(reviveOffer('normal', 0, REVIVE_PRICES[0] - 1)).toBeNull();
    expect(reviveOffer('normal', 0, REVIVE_PRICES[0])).toBe(REVIVE_PRICES[0]);
    expect(reviveOffer('daily', 0, 1000)).toBeNull();
  });
});

describe('reviving in the engine', () => {
  it('puts the ball back in orbit with a fresh fuse and keeps the score', () => {
    const s = newGame(3);
    hop(s);
    hop(s);
    runFor(s, 20);
    expect(s.dead).toBe(true);
    expect(s.landings[s.landings.length - 1][1]).toBe(TRACK_END);
    const { score, cur } = s;
    drain(s);

    revive(s);
    expect(s.dead).toBe(false);
    expect(s.deathReason).toBeNull();
    expect(s.revives).toBe(1);
    expect(s.score).toBe(score);
    expect(s.cur).toBe(cur);
    expect(s.combo).toBe(0);
    const p = currentPlanet(s);
    expect(p.fuse).toBe(p.fuseMax);
    expect(Math.hypot(s.bx - p.x, s.by - p.y)).toBeCloseTo(p.orbit);
    expect(s.landings[s.landings.length - 1][1]).not.toBe(TRACK_END);
    expect(drain(s)).toEqual(['revive']);

    step(s, 1 / 60);
    expect(s.dead).toBe(false);
    hop(s);
    expect(s.cur).toBe(cur + 1);
    expect(runResult(s).score).toBeGreaterThan(score);
  });

  it('does nothing while alive', () => {
    const s = newGame(1);
    revive(s);
    expect(s.revives).toBe(0);
    expect(drain(s)).toEqual([]);
  });
});

describe('revive ledger entries', () => {
  it('record the run and which revive was paid', () => {
    const prev = saveWith({ wallet: 300 });
    const entries = diffLedger(prev, { ...prev, wallet: 150 }, { source: 'revive', runId: 'run-1', count: 2 }, () => 'r');
    expect(entries).toEqual([{ id: 'r', kind: 'spend', source: 'revive', amount: 150, wallet_after: 150, detail: { run_id: 'run-1', count: 2 } }]);
  });
});

describe('sound effects', () => {
  it('climb a scale with the combo', () => {
    expect(perfectSound(0)).toBe('perfect_1');
    expect(perfectSound(3)).toBe('perfect_3');
    expect(perfectSound(50)).toBe(`perfect_${PERFECT_NOTES}`);
    expect(soundForEvent('perfect', 4)).toBe('perfect_4');
  });

  it('cover every game event that has a sound, with a file for each', () => {
    for (const e of ['launch', 'land', 'coin', 'death', 'fever', 'boss', 'comet', 'revive'] as const) expect(soundForEvent(e, 1)).toBe(e);
    for (const name of Object.keys(SOURCES)) expect(existsSync(join(__dirname, '../../assets/sounds', `${name}.wav`))).toBe(true);
  });
});

describe('end of run flow', () => {
  const frames = (flow: EndFlow, seconds: number, dead: boolean, price: number | null) => {
    const out: (number | 'end')[] = [];
    for (let t = 0; t < seconds; t += 1 / 60) {
      const r = flow.tick(1 / 60, dead, () => price);
      if (r !== null) out.push(r);
    }
    return out;
  };

  it('ends shortly after death when no revive is offered', () => {
    const flow = new EndFlow();
    expect(frames(flow, 2, true, null)).toEqual(['end']);
    expect(flow.ended).toBe(true);
  });

  it('waits on an offer, then ends once it is declined or times out', () => {
    const flow = new EndFlow();
    expect(frames(flow, 3, true, 50)).toEqual([50]);
    flow.decline();
    expect(frames(flow, 0.1, true, 50)).toEqual(['end']);
  });

  it('can offer again after a revive, and still ends after the next death', () => {
    const flow = new EndFlow();
    expect(frames(flow, 1, true, 50)).toEqual([50]);
    flow.resume();
    expect(frames(flow, 1, false, 150)).toEqual([]);
    expect(frames(flow, 1, true, 150)).toEqual([150]);
    flow.resume();
    expect(frames(flow, 2, true, null)).toEqual(['end']);
  });
});
