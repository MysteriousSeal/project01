import { CATALOG, DEFAULT_COSMETIC } from './cosmetics';
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
  upgrades: Record<string, number>;
  missions: Mission[];
  lastDaily: string;
  streak: number;
};

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
  upgrades: {},
  missions: [],
  lastDaily: '',
  streak: 0,
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

export function normalizeSave(input: unknown): Save {
  const base = defaultSave();
  if (!input || typeof input !== 'object') return base;
  const r = input as Raw;

  const skins = collection(r.skins ?? r.owned, new Set(CATALOG.skin.items.map((i) => i.id)));
  const trails = collection(r.trails, new Set(CATALOG.trail.items.map((i) => i.id)));
  const skin = skins.includes(text(r.skin)) ? text(r.skin) : DEFAULT_COSMETIC;
  const trail = trails.includes(text(r.trail)) ? text(r.trail) : DEFAULT_COSMETIC;

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
    skin,
    skins,
    trail,
    trails,
    upgrades,
    missions: missions.slice(0, MISSION_SLOTS),
    lastDaily: text(r.lastDaily),
    streak: count(r.streak),
  };
}
