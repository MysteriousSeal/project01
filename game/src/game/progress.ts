import type { RunResult } from './GameView';
import type { Mission, MissionKind, Save } from './save';

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

const KINDS: MissionKind[] = ['score', 'coins', 'perfects', 'combo', 'games', 'totalScore'];

export function missionLabel(m: Mission) {
  switch (m.kind) {
    case 'score': return `Reach ${m.target} in one run`;
    case 'coins': return `Collect ${m.target} coins in one run`;
    case 'perfects': return `Land ${m.target} perfects in one run`;
    case 'combo': return `Hit a x${m.target} combo`;
    case 'games': return `Play ${m.target} games`;
    case 'totalScore': return `Score ${m.target} total`;
  }
}

function makeMission(lvl: number, avoid: MissionKind[]): Mission {
  const pool = KINDS.filter((k) => !avoid.includes(k));
  const kind = pool[Math.floor(Math.random() * pool.length)];
  const f = 1 + (lvl - 1) * 0.25;
  const target = Math.round(
    kind === 'score' ? 10 * f
    : kind === 'coins' ? 3 * f
    : kind === 'perfects' ? 3 * f
    : kind === 'combo' ? Math.min(2 + Math.floor(lvl / 2), 12)
    : kind === 'games' ? 3 + Math.floor(lvl / 3)
    : 40 * f,
  );
  return { id: `${kind}-${Date.now()}-${Math.random()}`, kind, target, progress: 0, reward: 10 + lvl * 4 };
}

export function ensureMissions(save: Save): Save {
  const lvl = levelInfo(save.xp).lvl;
  const missions = [...save.missions];
  while (missions.length < 3) missions.push(makeMission(lvl, missions.map((m) => m.kind)));
  return { ...save, missions };
}

export type RunReport = {
  save: Save;
  xpGained: number;
  levelBefore: number;
  levelAfter: number;
  levelReward: number;
  completed: Mission[];
  shown: Mission[];
  newBest: boolean;
};

export function applyRun(save: Save, r: RunResult): RunReport {
  const levelBefore = levelInfo(save.xp).lvl;
  const xpGained = r.score + r.perfects * 2 + r.coins;
  const completed: Mission[] = [];
  const kept: Mission[] = [];
  const shown: Mission[] = [];
  for (const m of save.missions) {
    const val =
      m.kind === 'score' ? r.score
      : m.kind === 'coins' ? r.coins
      : m.kind === 'perfects' ? r.perfects
      : m.kind === 'combo' ? r.bestCombo
      : m.kind === 'games' ? m.progress + 1
      : m.progress + r.score;
    const progress = m.kind === 'games' || m.kind === 'totalScore' ? val : Math.max(m.progress, val);
    const nm = { ...m, progress: Math.min(progress, m.target) };
    (nm.progress >= m.target ? completed : kept).push(nm);
    shown.push(nm);
  }
  const xp = save.xp + xpGained;
  const levelAfter = levelInfo(xp).lvl;
  let levelReward = 0;
  for (let l = levelBefore + 1; l <= levelAfter; l++) levelReward += 20 + l * 6;
  const missionCoins = completed.reduce((a, m) => a + m.reward, 0);
  const next = ensureMissions({
    ...save,
    xp,
    best: Math.max(save.best, r.score),
    bestPlanet: Math.max(save.bestPlanet, r.planets),
    wallet: save.wallet + r.coins + missionCoins + levelReward,
    games: save.games + 1,
    missions: kept,
  });
  return { save: next, xpGained, levelBefore, levelAfter, levelReward, completed, shown, newBest: r.score > save.best && r.score > 0 };
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

export function dailyStatus(save: Save) {
  const now = new Date();
  const today = dayKey(now);
  const yesterday = dayKey(new Date(now.getTime() - 86400000));
  const streak = save.lastDaily === yesterday ? save.streak + 1 : 1;
  return { available: save.lastDaily !== today, streak, reward: 15 + Math.min(streak, 7) * 10, today };
}

export function claimDaily(save: Save): Save {
  const d = dailyStatus(save);
  if (!d.available) return save;
  return { ...save, lastDaily: d.today, streak: d.streak, wallet: save.wallet + d.reward };
}
