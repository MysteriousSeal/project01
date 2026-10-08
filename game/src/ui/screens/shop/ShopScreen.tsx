import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CATALOG, CosmeticKind, skinById, trailById } from '../../../game/meta/cosmetics';
import { Save } from '../../../game/meta/save';
import { buyCosmetic, buyUpgrade, equipCosmetic, ShopResult } from '../../../game/meta/shop';
import { haptic } from '../../../services/haptics';
import { Ball } from '../../components/Ball';
import { OrbitHero } from '../../components/OrbitHero';
import { Page } from '../../components/Page';
import { TrailDot } from '../../components/TrailDot';
import { useReducedMotion } from '../../hooks';
import { C, GUTTER, RADIUS } from '../../theme';
import { CosmeticTab } from './CosmeticTab';
import { UpgradesTab } from './UpgradesTab';

type Tab = CosmeticKind | 'upgrades';
const TABS: { id: Tab; label: string }[] = [
  { id: 'skin', label: 'Skins' },
  { id: 'trail', label: 'Trails' },
  { id: 'upgrades', label: 'Upgrades' },
];
const HERO = 120;
const HERO_PLANET = '#3a4590';

export function ShopScreen({ save, onChange }: { save: Save; onChange: (s: Save) => void }) {
  const [tab, setTab] = useState<Tab>('skin');
  const still = useReducedMotion();
  const skin = skinById(save.skin);
  const trail = trailById(save.trail);

  const apply = (next: ShopResult, cue: 'success' | 'select') => {
    if (!next) return;
    onChange(next);
    haptic(cue);
  };
  const cosmeticProps = (kind: CosmeticKind) => ({
    items: CATALOG[kind].items,
    owned: save[CATALOG[kind].owned],
    equipped: save[CATALOG[kind].equipped],
    wallet: save.wallet,
    onBuy: (id: string) => apply(buyCosmetic(save, kind, id), 'success'),
    onEquip: (id: string) => apply(equipCosmetic(save, kind, id), 'select'),
  });

  return (
    <Page save={save} title="Shop" scroll={false} right={tab !== 'upgrades' ? `${save[CATALOG[tab].owned].length}/${CATALOG[tab].items.length} owned` : undefined}>

      <View style={styles.tabs} accessibilityRole="tablist">
        {TABS.map((t) => (
          <Pressable key={t.id} onPress={() => setTab(t.id)} style={[styles.tab, tab === t.id && styles.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: tab === t.id }}>
            <Text style={[styles.tabTxt, tab === t.id && styles.tabTxtOn]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'skin' && (
        <CosmeticTab
          key="skin"
          {...cosmeticProps('skin')}
          renderIcon={(id) => {
            const k = skinById(id);
            return (
              <View style={styles.skinIcon}>
                <View style={[styles.dot, { width: 8, height: 8, backgroundColor: k.trail, opacity: 0.4 }]} />
                <View style={[styles.dot, { width: 13, height: 13, backgroundColor: k.trail, opacity: 0.7 }]} />
                <Ball color={k.ball} size={24} outline={k.outline} glow={false} />
              </View>
            );
          }}
          renderHero={(id) => <OrbitHero size={HERO} planetColor={HERO_PLANET} skin={skinById(id)} trailStyle={trail.id} still={still} />}
        />
      )}

      {tab === 'trail' && (
        <CosmeticTab
          key="trail"
          {...cosmeticProps('trail')}
          renderIcon={(id) => (
            <View style={styles.trailIcon}>
              {[0, 1, 2, 3, 4].map((i) => <TrailDot key={i} style={trailById(id).id} k={(i + 1) / 5} i={i} x={8 + i * 13} y={15} color={skin.trail} t={i * 0.1} scale={0.7} />)}
            </View>
          )}
          renderHero={(id) => <OrbitHero size={HERO} planetColor={HERO_PLANET} skin={skin} trailStyle={trailById(id).id} still={still} />}
        />
      )}

      {tab === 'upgrades' && <UpgradesTab save={save} onBuy={(id) => apply(buyUpgrade(save, id), 'success')} />}
    </Page>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', marginHorizontal: GUTTER, marginBottom: 12, padding: 4, borderRadius: RADIUS.lg, backgroundColor: C.panel, borderWidth: 1, borderColor: C.line },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: RADIUS.sm + 2 },
  tabOn: { backgroundColor: C.sky },
  tabTxt: { color: C.dim, fontWeight: '800', fontSize: 14 },
  tabTxtOn: { color: C.space, fontWeight: '900' },
  skinIcon: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 30 },
  trailIcon: { width: 70, height: 30 },
  dot: { borderRadius: 20 },
});
