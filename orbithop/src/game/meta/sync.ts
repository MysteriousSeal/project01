import { levelInfo } from './progress';
import type { Save } from './save';

export type SaveSource = 'local' | 'remote';

export const touch = (save: Save, now: number = Date.now()): Save => ({ ...save, savedAt: Math.max(now, save.savedAt + 1) });

export function resolveSave(local: Save, remote: Save | null): { save: Save; source: SaveSource } {
  return remote && remote.savedAt > local.savedAt ? { save: remote, source: 'remote' } : { save: local, source: 'local' };
}

export type ProgressSummary = { level: number; wallet: number; best: number; games: number; items: number };

export function progressSummary(save: Save): ProgressSummary {
  return { level: levelInfo(save.xp).lvl, wallet: save.wallet, best: save.best, games: save.games, items: save.skins.length + save.trails.length + save.themes.length - 3 };
}

export const progressScore = (save: Save) => save.xp + save.wallet + save.best * 10;

export const recommendedSource = (local: Save, remote: Save): SaveSource => (progressScore(remote) >= progressScore(local) ? 'remote' : 'local');
