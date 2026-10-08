import { useEffect, useEffectEvent, useRef } from 'react';
import { AppState } from 'react-native';
import type { Save } from '../../game/meta/save';
import { supabaseCloud } from '../backend/savesApi';
import { ChooseSave, CloudSync } from '../sync/cloudSync';
import { supabase } from '../backend/client';

export const cloudEnabled = supabase !== null;

export function useCloudSync(save: Save | null, onAdopt: (save: Save) => void) {
  const sync = useRef<CloudSync | null>(null);
  const adopt = useEffectEvent(onAdopt);
  const current = useEffectEvent(() => save);
  const loaded = save !== null;

  useEffect(() => {
    if (!supabase || !loaded) return;
    const s = new CloudSync(supabaseCloud(supabase), (remote) => adopt(remote));
    sync.current = s;
    const local = current();
    if (local) void s.start(local);
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') void sync.current?.flush();
    });
    return () => {
      sub.remove();
      sync.current?.stop();
      sync.current = null;
    };
  }, [loaded]);

  useEffect(() => {
    if (save) sync.current?.update(save);
  }, [save]);

  return async (choose: ChooseSave) => {
    if (!supabase || !save) return;
    sync.current?.stop();
    const s = new CloudSync(supabaseCloud(supabase), onAdopt);
    sync.current = s;
    await s.start(save, choose);
  };
}
