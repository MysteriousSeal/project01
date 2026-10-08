import { useEffect, useEffectEvent, useState } from 'react';
import { ChangeReason, diffLedger, settleArrival } from '../../game/meta/ledger';
import { ensureMissions } from '../../game/meta/progress';
import type { Save } from '../../game/meta/save';
import { uuid } from '../../game/meta/stats';
import { touch } from '../../game/meta/sync';
import { awardTrophies, trophiesEarned } from '../../game/meta/trophies';
import { haptic } from '../device/haptics';
import { loadSave, writeSave } from '../device/storage';
import { telemetry } from '../instances';

/**
 * The player's save: loaded from the device, written back on every change, and changed only
 * through `update`, which settles trophies and records the coin ledger in one place.
 */
export function useSaveState(onNewTrophies: () => void) {
  const [save, setSave] = useState<Save | null>(null);

  const arrive = (s: Save) => {
    const settled = settleArrival(ensureMissions(s), telemetry !== null, uuid);
    if (settled.entries.length) void telemetry?.logLedger(settled.entries);
    setSave(settled.changed ? touch(settled.save) : settled.save);
    if (settled.trophies) {
      onNewTrophies();
      haptic('success');
    }
  };

  const arriveFromDevice = useEffectEvent(arrive);
  useEffect(() => {
    let alive = true;
    loadSave().then((s) => alive && arriveFromDevice(s));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (save) writeSave(save);
  }, [save]);

  function update(next: Save, reason: ChangeReason = { source: 'other' }) {
    if (!save) return;
    const settled = awardTrophies(next).save;
    void telemetry?.logLedger(diffLedger(save, settled, reason, uuid));
    if (trophiesEarned(settled) > trophiesEarned(save)) onNewTrophies();
    setSave(touch(settled));
  }

  /** Swaps in a save from the cloud. */
  const replace = (next: Save) => arrive(next);

  return { save, update, replace };
}
