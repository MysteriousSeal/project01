import { describe, expect, it } from '@jest/globals';
import { SKINS, TRAILS } from '../../src/game/meta/cosmetics';
import { buyCosmetic, buyUpgrade, equipCosmetic, upgradeCost, upgradeLevel } from '../../src/game/meta/shop';
import { modsFrom, UPGRADES } from '../../src/game/meta/upgrades';
import { saveWith } from '../helpers';

const ember = SKINS.find((s) => s.id === 'ember')!;
const comet = TRAILS.find((t) => t.id === 'comet')!;

describe('cosmetics', () => {
  it('buys, owns and equips a skin', () => {
    const next = buyCosmetic(saveWith({ wallet: ember.price + 5 }), 'skin', ember.id)!;
    expect(next.wallet).toBe(5);
    expect(next.skins).toContain(ember.id);
    expect(next.skin).toBe(ember.id);
  });

  it('buys trails into the trail collection', () => {
    const next = buyCosmetic(saveWith({ wallet: comet.price }), 'trail', comet.id)!;
    expect(next.trails).toContain(comet.id);
    expect(next.trail).toBe(comet.id);
    expect(next.skins).toEqual(['classic']);
  });

  it('refuses unaffordable, already owned and unknown items', () => {
    expect(buyCosmetic(saveWith({ wallet: ember.price - 1 }), 'skin', ember.id)).toBeNull();
    expect(buyCosmetic(saveWith({ wallet: 9999 }), 'skin', 'classic')).toBeNull();
    expect(buyCosmetic(saveWith({ wallet: 9999 }), 'skin', 'nope')).toBeNull();
    expect(buyCosmetic(saveWith({ wallet: 9999 }), 'trail', ember.id)).toBeNull();
  });

  it('equips only owned, not-yet-equipped items', () => {
    const s = saveWith({ skins: ['classic', ember.id] });
    expect(equipCosmetic(s, 'skin', ember.id)!.skin).toBe(ember.id);
    expect(equipCosmetic(s, 'skin', 'classic')).toBeNull();
    expect(equipCosmetic(s, 'skin', 'gold')).toBeNull();
  });
});

describe('upgrades', () => {
  it('walks through every level then stops at max', () => {
    for (const u of UPGRADES) {
      let s = saveWith({ wallet: u.costs.reduce((a, b) => a + b, 0) });
      for (let lvl = 0; lvl < u.costs.length; lvl++) {
        expect(upgradeCost(s, u.id)).toBe(u.costs[lvl]);
        s = buyUpgrade(s, u.id)!;
        expect(upgradeLevel(s, u.id)).toBe(lvl + 1);
      }
      expect(s.wallet).toBe(0);
      expect(upgradeCost(s, u.id)).toBeNull();
      expect(buyUpgrade({ ...s, wallet: 1e6 }, u.id)).toBeNull();
    }
  });

  it('refuses unaffordable or unknown upgrades', () => {
    expect(buyUpgrade(saveWith({ wallet: 0 }), 'sturdy')).toBeNull();
    expect(buyUpgrade(saveWith({ wallet: 1e6 }), 'nope')).toBeNull();
  });

  it('turns levels into run modifiers, clamping out-of-range levels', () => {
    expect(modsFrom({})).toEqual({ fuseBonus: 0, magnetTime: 8, feverTime: 6, powerChance: 0.1, startShield: false });
    const max = modsFrom({ sturdy: 99, magnet: 3, fever: 3, lucky: 3, shield: 1 });
    expect(max.fuseBonus).toBeCloseTo(1.2);
    expect(max.magnetTime).toBe(14);
    expect(max.feverTime).toBe(9);
    expect(max.powerChance).toBeCloseTo(0.22);
    expect(max.startShield).toBe(true);
  });
});
