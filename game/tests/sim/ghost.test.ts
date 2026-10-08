import { describe, expect, it } from '@jest/globals';
import { runResult } from '../../src/game/sim/engine';
import { parseTrack, type Track, TRACK_END, trackBest } from '../../src/game/sim/ghost';
import { drain, hop, newGame, runFor } from '../helpers';

describe('ghost', () => {
  it('records landings and a final death marker', () => {
    const s = newGame();
    hop(s);
    hop(s);
    runFor(s, 10);
    const r = runResult(s);
    expect(r.landings.map(([, idx]) => idx)).toEqual([1, 2, TRACK_END]);
    expect(r.landings.every(([t], i, a) => i === 0 || t >= a[i - 1][0])).toBe(true);
    expect(trackBest(r.landings)).toBe(2);
  });

  it('follows the recorded track over time and finishes', () => {
    const ghost: Track = [[0.2, 1], [0.4, 2], [0.6, 3], [5, TRACK_END]];
    const s = newGame(1, { ghost });
    runFor(s, 0.3);
    expect(s.ghostIdx).toBe(1);
    runFor(s, 0.35);
    expect(s.ghostIdx).toBe(3);
    expect(s.ghostDone).toBe(false);
    s.planets.forEach((p) => (p.fuse = p.fuseMax = 99));
    runFor(s, 5);
    expect(s.ghostDone).toBe(true);
  });

  it('announces overtaking the ghost only after it was ahead', () => {
    const s = newGame(1, { ghost: [[0.05, 1], [60, 2], [61, TRACK_END]] });
    runFor(s, 0.1);
    expect(s.ghostAhead).toBe(true);
    hop(s);
    expect(drain(s)).not.toContain('ghost');
    hop(s);
    expect(drain(s)).toContain('ghost');
    hop(s);
    expect(drain(s)).not.toContain('ghost');
  });

  it('parses stored tracks defensively', () => {
    expect(parseTrack('x')).toEqual([]);
    expect(parseTrack([[0.1, 1], [0.05, 2], ['a', 3], [0.3, 1.5], [0.4, -2], [0.5, TRACK_END], [0.6]])).toEqual([[0.1, 1], [0.5, TRACK_END]]);
  });
});
