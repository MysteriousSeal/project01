import { describe, expect, it } from '@jest/globals';
import { emptyChallenges, medalsOf, slotOf, startChallenge, streakBonus } from '../../src/game/meta/challenge';
import { challengeTypeById } from '../../src/game/meta/challengeTypes';
import { advanceMission, fillMissions, isDone, makeMission, type Mission, MISSION_KINDS, MISSION_SLOTS, missionLabel } from '../../src/game/meta/missions';
import { applyRun, ensureMissions, levelInfo, levelUpReward, xpForLevel, xpForRun } from '../../src/game/meta/progress';
import { type Track, TRACK_END } from '../../src/game/sim/ghost';
import { seededRng } from '../../src/game/sim/rng';
import { day, MONDAY, result, saveWith } from '../helpers';

const mission = (patch: Partial<Mission>): Mission => ({ id: `m-${Math.random()}`, kind: 'score', target: 10, progress: 0, reward: 20, ...patch });

describe('levels', () => {
  it('computes level boundaries', () => {
    expect(levelInfo(0)).toEqual({ lvl: 1, into: 0, need: xpForLevel(1) });
    expect(levelInfo(xpForLevel(1) - 1).lvl).toBe(1);
    expect(levelInfo(xpForLevel(1)).lvl).toBe(2);
    expect(levelInfo(xpForLevel(1) + xpForLevel(2) + 5)).toEqual({ lvl: 3, into: 5, need: xpForLevel(3) });
  });

  it('sums level-up rewards over every level gained', () => {
    expect(levelUpReward(1, 1)).toBe(0);
    expect(levelUpReward(1, 3)).toBe(20 + 2 * 6 + 20 + 3 * 6);
  });

  it('rewards score, perfects and coins with xp', () => {
    expect(xpForRun(result({ score: 10, perfects: 3, coins: 4 }))).toBe(20);
  });
});

describe('missions', () => {
  it('labels every kind', () => {
    for (const kind of MISSION_KINDS) expect(missionLabel(mission({ kind }))).toMatch(/\d/);
  });

  it('fills to the slot count with distinct kinds', () => {
    const ms = fillMissions([], 4, seededRng(2));
    expect(ms).toHaveLength(MISSION_SLOTS);
    expect(new Set(ms.map((m) => m.kind)).size).toBe(MISSION_SLOTS);
    expect(fillMissions(ms, 4)).toEqual(ms);
  });

  it('scales targets and rewards with level', () => {
    const low = makeMission(1, [], () => 0);
    const high = makeMission(9, [], () => 0);
    expect(low.kind).toBe(high.kind);
    expect(high.target).toBeGreaterThan(low.target);
    expect(high.reward).toBeGreaterThan(low.reward);
  });

  it('tracks best-in-run for single-run kinds and accumulates the others', () => {
    expect(advanceMission(mission({ kind: 'score', progress: 6 }), result({ score: 4 })).progress).toBe(6);
    expect(advanceMission(mission({ kind: 'score', progress: 6 }), result({ score: 8 })).progress).toBe(8);
    expect(advanceMission(mission({ kind: 'totalScore', target: 100, progress: 30 }), result({ score: 15 })).progress).toBe(45);
    expect(advanceMission(mission({ kind: 'games', target: 3, progress: 1 }), result()).progress).toBe(2);
    expect(advanceMission(mission({ kind: 'coins', target: 5 }), result({ coins: 9 })).progress).toBe(5);
  });
});

describe('applyRun', () => {
  const base = () =>
    saveWith({
      best: 10,
      bestPlanet: 4,
      wallet: 100,
      missions: [
        mission({ id: 'a', kind: 'score', target: 10, reward: 30 }),
        mission({ id: 'b', kind: 'games', target: 3, progress: 2, reward: 25 }),
        mission({ id: 'c', kind: 'coins', target: 50, reward: 40 }),
      ],
    });

  it('updates records, pays completed missions and refills them', () => {
    const r = result({ score: 12, coins: 3, perfects: 1, bestCombo: 1, planets: 9 });
    const rep = applyRun(base(), r, { rng: seededRng(1) });
    expect(rep.newBest).toBe(true);
    expect(rep.save.best).toBe(12);
    expect(rep.save.bestPlanet).toBe(9);
    expect(rep.save.games).toBe(1);
    expect(rep.completed.map((m) => m.id)).toEqual(['a', 'b']);
    expect(rep.shown.map((m) => [m.id, isDone(m)])).toEqual([['a', true], ['b', true], ['c', false]]);
    expect(rep.save.missions).toHaveLength(MISSION_SLOTS);
    expect(rep.save.missions[0].id).toBe('c');
    expect(rep.save.xp).toBe(xpForRun(r));
    expect(rep.save.wallet).toBe(100 + 3 + 30 + 25 + rep.levelReward);
  });

  it('keeps records when the run is worse and never flags a zero score as best', () => {
    const rep = applyRun(saveWith(), result(), { rng: seededRng(1) });
    expect(rep.newBest).toBe(false);
    const worse = applyRun(base(), result({ score: 2, planets: 1 }), { rng: seededRng(1) });
    expect(worse.save.best).toBe(10);
    expect(worse.save.bestPlanet).toBe(4);
    expect(worse.newBest).toBe(false);
  });

  it('pays level-up rewards when crossing levels', () => {
    const rep = applyRun(saveWith({ xp: xpForLevel(1) - 1 }), result({ score: 5 }), { rng: seededRng(1) });
    expect(rep.levelBefore).toBe(1);
    expect(rep.levelAfter).toBe(2);
    expect(rep.levelReward).toBe(levelUpReward(1, 2));
  });

  it('ensureMissions only tops up missing slots', () => {
    const s = ensureMissions(saveWith(), seededRng(4));
    expect(s.missions).toHaveLength(MISSION_SLOTS);
    expect(ensureMissions(s).missions).toEqual(s.missions);
  });
});

describe('run modes', () => {
  const M = medalsOf(challengeTypeById('classic'));

  it('normal runs store the ghost when beating the best planet', () => {
    const landings: Track = [[1, 1], [2, 2], [3, TRACK_END]];
    const rep = applyRun(saveWith({ bestPlanet: 1 }), result({ score: 3, planets: 2, landings }), { rng: seededRng(1) });
    expect(rep.save.ghost).toEqual(landings);
    const worse = applyRun(rep.save, result({ score: 1, planets: 1, landings: [[1, 1]] }), { rng: seededRng(1) });
    expect(worse.save.ghost).toEqual(landings);
  });

  it('records a ghost whenever a run beats the current ghost, even below an old record', () => {
    const landings: Track = [[1, 1], [2, 2], [3, 3], [4, TRACK_END]];
    const veteran = saveWith({ best: 80, bestPlanet: 40, ghost: [] });
    const rep = applyRun(veteran, result({ score: 4, planets: 3, landings }), { rng: seededRng(1) });
    expect(rep.save.ghost).toEqual(landings);
    expect(rep.save.bestPlanet).toBe(40);
  });

  it('daily runs pay medals but leave normal records alone', () => {
    const now = day(MONDAY);
    const save = saveWith({ best: 5, bestPlanet: 3, wallet: 0, challenges: startChallenge(emptyChallenges(), 'classic', now)! });
    const rep = applyRun(save, result({ score: 40, coins: 2, planets: 15 }), { mode: 'daily', challenge: 'classic', rng: seededRng(1), now });
    expect(rep.save.best).toBe(5);
    expect(rep.save.bestPlanet).toBe(3);
    expect(rep.newBest).toBe(false);
    expect(rep.challenge?.medal).toBe(2);
    expect(slotOf(rep.save.challenges, 'classic')!.best).toBe(40);
    expect(rep.save.wallet).toBe(2 + rep.levelReward + M[0].reward + M[1].reward + streakBonus(1) + rep.completed.reduce((a, m) => a + m.reward, 0));
  });
});
