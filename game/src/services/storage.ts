import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultSave, normalizeSave, Save } from '../game/meta/save';

const KEY = 'orbit-hop-save-v1';

export async function loadSave(): Promise<Save> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? normalizeSave(JSON.parse(raw)) : defaultSave();
  } catch {
    return defaultSave();
  }
}

export function writeSave(save: Save) {
  AsyncStorage.setItem(KEY, JSON.stringify(save)).catch(() => {});
}
