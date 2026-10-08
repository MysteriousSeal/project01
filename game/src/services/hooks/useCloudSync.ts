import { useEffect, useEffectEvent, useRef } from 'react';
import { AppState } from 'react-native';
import type { Save } from '../../game/meta/save';
import { ChooseSave, CloudSync } from '../sync/cloudSync';
import { savesApi } from '../instances';

export function useCloudSync(save: Save | null, onAdopt: (save: Save) => void) {
  const sync = useRef<CloudSync | null>(null);
  const adopt = useEffectEvent(onAdopt);
  const current = useEffectEvent(() => save);
  const loaded = save !== null;

  useEffect(() => {
    if (!savesApi || !loaded) return;
    const s = new CloudSync(savesApi, (remote) => adopt(remote));
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
    if (!savesApi || !save) return;
    sync.current?.stop();
    const s = new CloudSync(savesApi, onAdopt);
    sync.current = s;
    await s.start(save, choose);
  };
}
