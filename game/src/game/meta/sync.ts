import type { Save } from './save';

export type SaveSource = 'local' | 'remote';

export const touch = (save: Save, now: number = Date.now()): Save => ({ ...save, savedAt: Math.max(now, save.savedAt + 1) });

export function resolveSave(local: Save, remote: Save | null): { save: Save; source: SaveSource } {
  return remote && remote.savedAt > local.savedAt ? { save: remote, source: 'remote' } : { save: local, source: 'local' };
}
