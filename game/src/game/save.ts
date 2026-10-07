import AsyncStorage from '@react-native-async-storage/async-storage';

export type Mission = { id: string; kind: MissionKind; target: number; progress: number; reward: number };
export type MissionKind = 'score' | 'coins' | 'perfects' | 'combo' | 'games' | 'totalScore';

export type Save = {
  best: number;
  wallet: number;
  xp: number;
  games: number;
  owned: string[];
  skin: string;
  missions: Mission[];
  bestPlanet: number;
  lastDaily: string;
  streak: number;
  trail: string;
  trails: string[];
  upgrades: Record<string, number>;
};

const KEY = 'orbit-hop-save-v1';

export const defaultSave = (): Save => ({ best: 0, wallet: 0, xp: 0, games: 0, owned: ['classic'], skin: 'classic', missions: [], bestPlanet: 0, lastDaily: '', streak: 0, trail: 'classic', trails: ['classic'], upgrades: {} });

export async function loadSave(): Promise<Save> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...defaultSave(), ...JSON.parse(raw) } : defaultSave();
  } catch {
    return defaultSave();
  }
}

export function writeSave(s: Save) {
  AsyncStorage.setItem(KEY, JSON.stringify(s)).catch(() => {});
}
