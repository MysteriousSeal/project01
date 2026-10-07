export type Mods = { fuseBonus: number; magnetTime: number; feverTime: number; powerChance: number; startShield: boolean };

export type UpgradeId = 'sturdy' | 'magnet' | 'fever' | 'lucky' | 'shield';
export type Upgrade = { id: UpgradeId; name: string; costs: number[]; effect: (lvl: number) => string };

export const UPGRADES: Upgrade[] = [
  { id: 'sturdy', name: 'Sturdy planets', costs: [120, 300, 600, 1000], effect: (l) => (l ? `Planets hold +${(l * 0.3).toFixed(1)}s longer` : 'Planets collapse at normal speed') },
  { id: 'magnet', name: 'Strong magnet', costs: [100, 250, 500], effect: (l) => `Magnet lasts ${8 + l * 2}s` },
  { id: 'fever', name: 'Longer fever', costs: [150, 350, 700], effect: (l) => `Fever lasts ${6 + l}s` },
  { id: 'lucky', name: 'Lucky finds', costs: [150, 400, 800], effect: (l) => `Power-ups on ${10 + l * 4}% of planets` },
  { id: 'shield', name: 'Starting shield', costs: [900], effect: (l) => (l ? 'Every run starts with a shield' : 'Runs start without a shield') },
];

export const upgradeById = (id: string) => UPGRADES.find((u) => u.id === id);
export const maxLevel = (id: string) => upgradeById(id)?.costs.length ?? 0;

export function modsFrom(levels: Partial<Record<string, number>>): Mods {
  const l = (id: UpgradeId) => Math.min(levels[id] ?? 0, maxLevel(id));
  return {
    fuseBonus: l('sturdy') * 0.3,
    magnetTime: 8 + l('magnet') * 2,
    feverTime: 6 + l('fever'),
    powerChance: 0.1 + l('lucky') * 0.04,
    startShield: l('shield') > 0,
  };
}

export const DEFAULT_MODS = modsFrom({});
