import { useEffect, useEffectEvent, useRef } from 'react';
import { AppState } from 'react-native';
import type { Save } from '../game/meta/save';
import { supabaseCloud } from './cloudApi';
import { CloudSync } from './cloudSync';
import { supabase } from './supabase';

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
      if (state !== 'active') void s.flush();
    });
    return () => {
      sub.remove();
      s.stop();
      sync.current = null;
    };
  }, [loaded]);

  useEffect(() => {
    if (save) sync.current?.update(save);
  }, [save]);
}
