import { DEFAULT_RULES, Rules } from './world';

export type ChallengeStat = 'score' | 'coins';

export type ChallengeType = {
  id: string;
  name: string;
  glyph: string;
  summary: string;
  stat: ChallengeStat;
  targets: [bronze: number, silver: number, gold: number];
  rules: Rules;
};

const rules = (patch: Partial<Rules>): Rules => ({ ...DEFAULT_RULES, ...patch });

export const CHALLENGE_TYPES: ChallengeType[] = [
  { id: 'fever', name: 'Fever Day', glyph: '✦', summary: 'Fever starts at a x3 combo and lasts 3s longer.', stat: 'score', targets: [20, 45, 75], rules: rules({ feverEvery: 3, feverBonus: 3 }) },
  { id: 'classic', name: 'Classic', glyph: '◎', summary: 'Standard rules. Score as high as you can.', stat: 'score', targets: [15, 35, 60], rules: rules({}) },
  { id: 'bossRush', name: 'Boss Rush', glyph: '☠', summary: 'A boss guards every 6th planet.', stat: 'score', targets: [25, 55, 90], rules: rules({ bossEvery: 6 }) },
  { id: 'perfect', name: 'Perfectionist', glyph: '◆', summary: 'Any landing that is not perfect ends the run.', stat: 'score', targets: [15, 40, 80], rules: rules({ perfectOnly: true }) },
  { id: 'speed', name: 'Speed Run', glyph: '⚡', summary: 'Planets collapse 40% faster.', stat: 'score', targets: [10, 25, 45], rules: rules({ fuseScale: 0.6 }) },
  { id: 'coins', name: 'Coin Hunt', glyph: '●', summary: 'Coins at every planet, more gold. Medals count coins.', stat: 'coins', targets: [10, 25, 45], rules: rules({ coinChance: 1, goldChance: 0.3 }) },
  { id: 'fragile', name: 'Fragile', glyph: '✕', summary: 'No shields or power-ups. Planets move from the start.', stat: 'score', targets: [12, 30, 50], rules: rules({ powerups: false, movingFrom: 1, moveChance: 0.5 }) },
];

export const challengeTypeById = (id: string) => CHALLENGE_TYPES.find((t) => t.id === id) ?? CHALLENGE_TYPES[1];

export const CHALLENGES_PER_DAY = 3;

export const challengeTypesFor = (d: Date) => Array.from({ length: CHALLENGES_PER_DAY }, (_, i) => CHALLENGE_TYPES[(d.getDay() + i * 2) % CHALLENGE_TYPES.length]);

export const statUnit = (t: ChallengeType) => (t.stat === 'coins' ? 'coins' : 'pts');
