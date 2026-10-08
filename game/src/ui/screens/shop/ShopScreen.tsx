import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { buyBoost } from '../../../game/meta/boosts';
import { CATALOG, CosmeticKind, skinById, themeById, trailById } from '../../../game/meta/cosmetics';
import { buyBundle, buyDeal, openMysteryBox } from '../../../game/meta/offers';
import { Save } from '../../../game/meta/save';
import { buyCosmetic, buyUpgrade, equipCosmetic, OfferItem, ShopResult } from '../../../game/meta/shop';
import { haptic } from '../../../services/haptics';
import { CosmeticPreview } from '../../components/CosmeticPreview';
import { OrbitHero } from '../../components/OrbitHero';
import { Page } from '../../components/Page';
import { useReducedMotion } from '../../hooks';
import { C, GUTTER, RADIUS } from '../../theme';
import { CosmeticTab } from './CosmeticTab';
import { FeaturedTab } from './FeaturedTab';
import { PowerTab } from './PowerTab';

type Tab = 'featured' | CosmeticKind | 'power';
const TABS: { id: Tab; label: string }[] = [
  { id: 'featured', label: 'Featured' },
  { id: 'skin', label: 'Skins' },
  { id: 'trail', label: 'Trails' },
  { id: 'theme', label: 'Themes' },
  { id: 'power', label: 'Power' },
];
const HERO = 120;

const isCosmetic = (t: Tab): t is CosmeticKind => t in CATALOG;

export function ShopScreen({ save, onChange }: { save: Save; onChange: (s: Save) => void }) {
  const [tab, setTab] = useState<Tab>('featured');
  const still = useReducedMotion();
  const skin = skinById(save.skin);
  const trail = trailById(save.trail);
  const theme = themeById(save.theme);

  const apply = (next: ShopResult, cue: 'success' | 'select' = 'success') => {
    if (!next) return false;
    onChange(next);
    haptic(cue);
    return true;
  };

  const hero = (kind: CosmeticKind, id: string) => {
    const k = kind === 'skin' ? skinById(id) : skin;
    const style = kind === 'trail' ? trailById(id).id : trail.id;
    const planet = (kind === 'theme' ? themeById(id) : theme).planet(2);
    return <OrbitHero size={HERO} planetColor={planet} skin={k} trailStyle={style} still={still} />;
  };

  const openBox = (): OfferItem | null => {
    const opened = openMysteryBox(save);
    return opened && apply(opened.save) ? opened.prize : null;
  };

  const right = isCosmetic(tab) ? `${save[CATALOG[tab].owned].length}/${CATALOG[tab].items.length} owned` : undefined;

  return (
    <Page save={save} title="Shop" scroll={false} right={right}>
      <View style={styles.tabs} accessibilityRole="tablist">
        {TABS.map((t) => (
          <Pressable key={t.id} onPress={() => setTab(t.id)} style={[styles.tab, tab === t.id && styles.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: tab === t.id }} accessibilityLabel={t.label}>
            <Text style={[styles.tabTxt, tab === t.id && styles.tabTxtOn]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'featured' && (
        <FeaturedTab
          save={save}
          onBuyDeal={() => apply(buyDeal(save))}
          onBuyBundle={(id) => apply(buyBundle(save, id))}
          onOpenBox={openBox}
          onEquip={(it) => apply(equipCosmetic(save, it.kind, it.id), 'select')}
        />
      )}

      {isCosmetic(tab) && (
        <CosmeticTab
          key={tab}
          items={CATALOG[tab].items}
          owned={save[CATALOG[tab].owned]}
          equipped={save[CATALOG[tab].equipped]}
          wallet={save.wallet}
          renderIcon={(id) => <CosmeticPreview kind={tab} id={id} trailColor={skin.trail} />}
          renderHero={(id) => hero(tab, id)}
          onBuy={(id) => apply(buyCosmetic(save, tab, id))}
          onEquip={(id) => apply(equipCosmetic(save, tab, id), 'select')}
        />
      )}

      {tab === 'power' && <PowerTab save={save} onBuyBoost={(id) => apply(buyBoost(save, id))} onBuyUpgrade={(id) => apply(buyUpgrade(save, id))} />}
    </Page>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', marginHorizontal: GUTTER, marginBottom: 12, padding: 4, gap: 2, borderRadius: RADIUS.lg, backgroundColor: C.panel, borderWidth: 1, borderColor: C.line },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, paddingVertical: 9, borderRadius: RADIUS.sm + 2 },
  tabOn: { backgroundColor: C.sky },
  tabTxt: { color: C.dim, fontWeight: '800', fontSize: 13 },
  tabTxtOn: { color: C.space, fontWeight: '900' },
});
