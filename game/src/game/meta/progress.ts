import { ChallengeOutcome, recordChallenge } from './challenge';
import type { RunResult } from '../sim/engine';
import { advanceMission, fillMissions, isDone, Mission } from './missions';
import type { Rng } from '../sim/rng';
import { trackBest } from '../sim/ghost';
import type { Save } from './save';
import type { RunMode } from './session';

export const xpForLevel = (lvl: number) => 80 + lvl * 40;

export function levelInfo(xp: number) {
  let lvl = 1;
  let rest = xp;
  while (rest >= xpForLevel(lvl)) {
    rest -= xpForLevel(lvl);
    lvl++;
  }
  return { lvl, into: rest, need: xpForLevel(lvl) };
}

export const levelOf = (save: Save) => levelInfo(save.xp).lvl;
export const xpForRun = (r: RunResult) => r.score + r.perfects * 2 + r.coins;

export function levelUpReward(from: number, to: number) {
  let total = 0;
  for (let l = from + 1; l <= to; l++) total += 20 + l * 6;
  return total;
}

export const ensureMissions = (save: Save, rng?: Rng): Save => ({ ...save, missions: fillMissions(save.missions, levelOf(save), rng) });

export type RunReport = {
  save: Save;
  xpGained: number;
  levelBefore: number;
  levelAfter: number;
  levelReward: number;
  completed: Mission[];
  shown: Mission[];
  newBest: boolean;
  challenge?: ChallengeOutcome;
};

export type ApplyOptions = { mode?: RunMode; challenge?: string; rng?: Rng; now?: Date };

export function applyRun(save: Save, r: RunResult, { mode = 'normal', challenge: type = '', rng, now }: ApplyOptions = {}): RunReport {
  const levelBefore = levelOf(save);
  const xpGained = xpForRun(r);
  const shown = save.missions.map((m) => advanceMission(m, r));
  const completed = shown.filter(isDone);
  const xp = save.xp + xpGained;
  const levelAfter = levelInfo(xp).lvl;
  const levelReward = levelUpReward(levelBefore, levelAfter);
  const missionCoins = completed.reduce((a, m) => a + m.reward, 0);
  const base: Save = { ...save, xp, wallet: save.wallet + r.coins + missionCoins + levelReward, games: save.games + 1, missions: shown.filter((m) => !isDone(m)) };
  const report = { xpGained, levelBefore, levelAfter, levelReward, completed, shown };

  if (mode === 'daily') {
    const recorded = recordChallenge(save.challenges, type, r, now);
    const next = ensureMissions(recorded ? { ...base, challenges: recorded.challenges, wallet: base.wallet + recorded.outcome.reward } : base, rng);
    return { ...report, save: next, newBest: false, challenge: recorded?.outcome };
  }

  const betterGhost = r.planets > trackBest(save.ghost);
  const next = ensureMissions(
    { ...base, best: Math.max(save.best, r.score), bestPlanet: Math.max(save.bestPlanet, r.planets), ghost: betterGhost ? r.landings : save.ghost },
    rng,
  );
  return { ...report, save: next, newBest: r.score > save.best && r.score > 0 };
}
