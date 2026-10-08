import { DEFAULT_MODS, Mods } from '../sim/world';

const STURDY_STEP = 0.3;
const MAGNET_STEP = 2;
const FEVER_STEP = 1;
const LUCKY_STEP = 0.04;

export type UpgradeId = 'sturdy' | 'magnet' | 'fever' | 'lucky' | 'shield';
export type Upgrade = { id: UpgradeId; name: string; costs: number[]; effect: (lvl: number) => string };

export const UPGRADES: Upgrade[] = [
  { id: 'sturdy', name: 'Sturdy planets', costs: [120, 300, 600, 1000], effect: (l) => (l ? `Planets hold +${(l * STURDY_STEP).toFixed(1)}s longer` : 'Planets collapse at normal speed') },
  { id: 'magnet', name: 'Strong magnet', costs: [100, 250, 500], effect: (l) => `Magnet lasts ${DEFAULT_MODS.magnetTime + l * MAGNET_STEP}s` },
  { id: 'fever', name: 'Longer fever', costs: [150, 350, 700], effect: (l) => `Fever lasts ${DEFAULT_MODS.feverTime + l * FEVER_STEP}s` },
  { id: 'lucky', name: 'Lucky finds', costs: [150, 400, 800], effect: (l) => `Power-ups on ${Math.round((DEFAULT_MODS.powerChance + l * LUCKY_STEP) * 100)}% of planets` },
  { id: 'shield', name: 'Starting shield', costs: [900], effect: (l) => (l ? 'Every run starts with a shield' : 'Runs start without a shield') },
];

export const upgradeById = (id: string) => UPGRADES.find((u) => u.id === id);
export const maxLevel = (id: string) => upgradeById(id)?.costs.length ?? 0;

export function modsFrom(levels: Partial<Record<string, number>>): Mods {
  const l = (id: UpgradeId) => Math.min(levels[id] ?? 0, maxLevel(id));
  return {
    fuseBonus: DEFAULT_MODS.fuseBonus + l('sturdy') * STURDY_STEP,
    magnetTime: DEFAULT_MODS.magnetTime + l('magnet') * MAGNET_STEP,
    feverTime: DEFAULT_MODS.feverTime + l('fever') * FEVER_STEP,
    powerChance: DEFAULT_MODS.powerChance + l('lucky') * LUCKY_STEP,
    startShield: DEFAULT_MODS.startShield || l('shield') > 0,
  };
}
