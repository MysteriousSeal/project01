import { CHALLENGE_ATTEMPTS, ChallengeSlot, DailyChallenges, emptyChallenges, MEDAL_TIERS } from './challenge';
import { CHALLENGE_TYPES, CHALLENGES_PER_DAY } from './challengeTypes';
import { BOOSTS, MAX_BOOST_STACK } from './boosts';
import { CATALOG, COSMETIC_KINDS, DEFAULT_COSMETIC } from './cosmetics';
import { parseTrack, Track } from '../sim/ghost';
import { Mission, MISSION_KINDS, MISSION_SLOTS } from './missions';
import { maxLevel, UPGRADES } from './upgrades';

export type Save = {
  best: number;
  bestPlanet: number;
  wallet: number;
  xp: number;
  games: number;
  skin: string;
  skins: string[];
  trail: string;
  trails: string[];
  theme: string;
  themes: string[];
  boosts: Record<string, number>;
  dealDay: string;
  boxDay: string;
  upgrades: Record<string, number>;
  missions: Mission[];
  lastDaily: string;
  streak: number;
  ghost: Track;
  challenges: DailyChallenges;
  settings: Settings;
};

export type Settings = { ghost: boolean };

const defaultSettings = (): Settings => ({ ghost: false });

export const defaultSave = (): Save => ({
  best: 0,
  bestPlanet: 0,
  wallet: 0,
  xp: 0,
  games: 0,
  skin: DEFAULT_COSMETIC,
  skins: [DEFAULT_COSMETIC],
  trail: DEFAULT_COSMETIC,
  trails: [DEFAULT_COSMETIC],
  theme: DEFAULT_COSMETIC,
  themes: [DEFAULT_COSMETIC],
  boosts: {},
  dealDay: '',
  boxDay: '',
  upgrades: {},
  missions: [],
  lastDaily: '',
  streak: 0,
  ghost: [],
  challenges: emptyChallenges(),
  settings: defaultSettings(),
});

type Raw = Record<string, unknown>;

const count = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
const text = (v: unknown) => (typeof v === 'string' ? v : '');

function collection(raw: unknown, valid: Set<string>) {
  const ids = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string' && valid.has(x)) : [];
  return [...new Set([DEFAULT_COSMETIC, ...ids])];
}

function mission(raw: unknown): Mission | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Raw;
  const kind = MISSION_KINDS.find((k) => k === m.kind);
  const target = count(m.target);
  if (!kind || !target || typeof m.id !== 'string') return null;
  return { id: m.id, kind, target, progress: Math.min(count(m.progress), target), reward: count(m.reward) };
}

function slot(raw: unknown): ChallengeSlot | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Raw;
  if (!CHALLENGE_TYPES.some((t) => t.id === c.type)) return null;
  return {
    type: c.type as string,
    attempts: Math.min(count(c.attempts), CHALLENGE_ATTEMPTS),
    best: count(c.best),
    medal: Math.min(count(c.medal), MEDAL_TIERS.length),
    ghost: parseTrack(c.ghost),
  };
}

function challenges(raw: unknown, legacy: unknown): DailyChallenges {
  const src = (raw && typeof raw === 'object' ? raw : legacy && typeof legacy === 'object' ? legacy : {}) as Raw;
  const slots = Array.isArray(src.slots) ? src.slots.map(slot).filter((x): x is ChallengeSlot => x !== null) : [];
  const unique = slots.filter((x, i) => slots.findIndex((y) => y.type === x.type) === i).slice(0, CHALLENGES_PER_DAY);
  return { day: unique.length ? text(src.day) : '', slots: unique, streak: count(src.streak), lastMedalDay: text(src.lastMedalDay) };
}

function settings(raw: unknown): Settings {
  const s = raw && typeof raw === 'object' ? (raw as Raw) : {};
  return { ghost: s.ghost === true };
}

export function normalizeSave(input: unknown): Save {
  const base = defaultSave();
  if (!input || typeof input !== 'object') return base;
  const r = input as Raw;

  const legacy: Raw = { ...r, skins: r.skins ?? r.owned };
  const cosmetics = {} as Pick<Save, 'skin' | 'skins' | 'trail' | 'trails' | 'theme' | 'themes'>;
  for (const kind of COSMETIC_KINDS) {
    const { owned, equipped, items } = CATALOG[kind];
    const list = collection(legacy[owned], new Set(items.map((i) => i.id)));
    cosmetics[owned] = list;
    cosmetics[equipped] = list.includes(text(r[equipped])) ? text(r[equipped]) : DEFAULT_COSMETIC;
  }

  const rawBoosts = r.boosts && typeof r.boosts === 'object' ? (r.boosts as Raw) : {};
  const boosts: Record<string, number> = {};
  for (const b of BOOSTS) {
    const n = Math.min(count(rawBoosts[b.id]), MAX_BOOST_STACK);
    if (n) boosts[b.id] = n;
  }

  const rawUp = r.upgrades && typeof r.upgrades === 'object' ? (r.upgrades as Raw) : {};
  const upgrades: Record<string, number> = {};
  for (const u of UPGRADES) {
    const lvl = Math.min(count(rawUp[u.id]), maxLevel(u.id));
    if (lvl) upgrades[u.id] = lvl;
  }

  const missions = (Array.isArray(r.missions) ? r.missions : []).map(mission).filter((m): m is Mission => m !== null);

  return {
    best: count(r.best),
    bestPlanet: count(r.bestPlanet),
    wallet: count(r.wallet),
    xp: count(r.xp),
    games: count(r.games),
    ...cosmetics,
    boosts,
    dealDay: text(r.dealDay),
    boxDay: text(r.boxDay),
    upgrades,
    missions: missions.slice(0, MISSION_SLOTS),
    lastDaily: text(r.lastDaily),
    streak: count(r.streak),
    ghost: parseTrack(r.ghost),
    challenges: challenges(r.challenges, r.challenge),
    settings: settings(r.settings),
  };
}
