import type { GameEvent } from '../../game/sim/engine';
import { hapticForEvent } from './haptics';
import { playSound, soundForEvent } from './sound';

/** Haptics and, when enabled, sound for one in-game event. */
export function gameFeedback(e: GameEvent, combo: number, sound: boolean) {
  hapticForEvent(e);
  const name = sound ? soundForEvent(e, combo) : null;
  if (name) playSound(name);
}
