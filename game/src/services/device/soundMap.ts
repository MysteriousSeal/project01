import type { GameEvent } from '../../game/sim/engine';

export const SOURCES = {
  launch: require('../../../assets/sounds/launch.wav'),
  land: require('../../../assets/sounds/land.wav'),
  perfect_1: require('../../../assets/sounds/perfect_1.wav'),
  perfect_2: require('../../../assets/sounds/perfect_2.wav'),
  perfect_3: require('../../../assets/sounds/perfect_3.wav'),
  perfect_4: require('../../../assets/sounds/perfect_4.wav'),
  perfect_5: require('../../../assets/sounds/perfect_5.wav'),
  perfect_6: require('../../../assets/sounds/perfect_6.wav'),
  perfect_7: require('../../../assets/sounds/perfect_7.wav'),
  perfect_8: require('../../../assets/sounds/perfect_8.wav'),
  coin: require('../../../assets/sounds/coin.wav'),
  power: require('../../../assets/sounds/power.wav'),
  saved: require('../../../assets/sounds/saved.wav'),
  fever: require('../../../assets/sounds/fever.wav'),
  milestone: require('../../../assets/sounds/milestone.wav'),
  best: require('../../../assets/sounds/best.wav'),
  boss: require('../../../assets/sounds/boss.wav'),
  comet: require('../../../assets/sounds/comet.wav'),
  zone: require('../../../assets/sounds/zone.wav'),
  ghost: require('../../../assets/sounds/ghost.wav'),
  death: require('../../../assets/sounds/death.wav'),
  revive: require('../../../assets/sounds/revive.wav'),
} as const;

export type SoundName = keyof typeof SOURCES;

/** Perfect landings climb a scale with the combo, then hold the top note. */
export const PERFECT_NOTES = 8;
export const perfectSound = (combo: number): SoundName => `perfect_${Math.min(Math.max(combo, 1), PERFECT_NOTES)}` as SoundName;

export function soundForEvent(e: GameEvent, combo: number): SoundName | null {
  return e === 'perfect' ? perfectSound(combo) : e in SOURCES ? (e as SoundName) : null;
}
