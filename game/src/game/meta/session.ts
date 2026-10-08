import { DEFAULT_MODS, DEFAULT_RULES, Mods, Rules } from '../sim/world';
import { Track } from '../sim/ghost';
import { attemptsLeft, challengeSeed, currentChallenges, slotOf, startChallenge, typeOf } from './challenge';
import { ChallengeType } from './challengeTypes';
import type { Save } from './save';
import { modsFrom } from './upgrades';

export type RunMode = 'normal' | 'daily';

export type RunConfig = {
  mode: RunMode;
  challenge?: ChallengeType;
  seed?: number;
  mods: Mods;
  rules: Rules;
  ghost: Track;
  bestIdx: number;
  showHint: boolean;
};

export const TUTORIAL_GAMES = 3;

const showHint = (save: Save) => save.games < TUTORIAL_GAMES;

export function startRun(save: Save, mode: RunMode, type = '', now: Date = new Date()): { save: Save; config: RunConfig } | null {
  if (mode === 'normal') {
    return {
      save,
      config: { mode, mods: modsFrom(save.upgrades), rules: DEFAULT_RULES, ghost: save.settings.ghost ? save.ghost : [], bestIdx: save.bestPlanet, showHint: showHint(save) },
    };
  }
  const challenges = startChallenge(save.challenges, type, now);
  const slot = challenges && slotOf(challenges, type);
  if (!challenges || !slot) return null;
  const challenge = typeOf(slot);
  return {
    save: { ...save, challenges },
    config: {
      mode,
      challenge,
      seed: challengeSeed(challenges.day, type),
      mods: DEFAULT_MODS,
      rules: challenge.rules,
      ghost: save.settings.ghost ? slot.ghost : [],
      bestIdx: 0,
      showHint: showHint(save),
    },
  };
}

export function retryMode(save: Save, config: RunConfig, now: Date = new Date()): { mode: RunMode; type?: string } {
  if (config.mode !== 'daily' || !config.challenge) return { mode: 'normal' };
  const slot = slotOf(currentChallenges(save.challenges, now), config.challenge.id);
  return slot && attemptsLeft(slot) > 0 ? { mode: 'daily', type: config.challenge.id } : { mode: 'normal' };
}
