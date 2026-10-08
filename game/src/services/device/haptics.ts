import * as Haptics from 'expo-haptics';
import type { GameEvent } from '../../game/sim/engine';

export type Cue = 'light' | 'medium' | 'heavy' | 'select' | 'success' | 'error';

const play: Record<Cue, () => Promise<void>> = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  select: () => Haptics.selectionAsync(),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
};

const EVENT_CUES: Record<GameEvent, Cue | null> = {
  launch: null,
  land: 'light',
  perfect: 'medium',
  coin: 'select',
  death: 'error',
  milestone: 'heavy',
  fever: 'heavy',
  saved: 'heavy',
  best: 'success',
  power: 'success',
  zone: null,
  boss: 'heavy',
  ghost: 'success',
  comet: 'success',
};

export function haptic(cue: Cue) {
  play[cue]().catch(() => {});
}

export function hapticForEvent(e: GameEvent) {
  const cue = EVENT_CUES[e];
  if (cue) haptic(cue);
}
