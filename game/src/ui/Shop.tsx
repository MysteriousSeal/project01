import { ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Save } from '../game/save';
import { skinById, SKINS, trailById, TRAILS } from '../game/skins';
import { BackButton } from './BackButton';
import { OrbitHero, useReducedMotion } from './Home';
import { TopBar } from './Screens';
import { C, F, fmt } from './theme';
import { TrailDot } from './TrailDot';
import { UpgradesTab } from './Upgrades';

type Tab = 'skins' | 'trails' | 'upgrades';
type Item = { id: string; name: string; price: number };

export function Shop({ save, onChange, onClose, onBuy }: { save: Save; onChange: (s: Save) => void; onClose: () => void; onBuy?: () => void }) {
  const [tab, setTab] = useState<Tab>('skins');
  const still = useReducedMotion();
  const skin = skinById(save.skin);
  const trail = trailById(save.trail);
  const spend = (price: number, patch: Partial<Save>) => {
    if (save.wallet < price) return;
    onChange({ ...save, ...patch, wallet: save.wallet - price });
    onBuy?.();
  };

  const owned = tab === 'skins' ? save.owned.length : tab === 'trails' ? save.trails.length : null;
  const total = tab === 'skins' ? SKINS.length : TRAILS.length;

  return (
    <View style={styles.root}>
      <TopBar save={save} />
      <View style={styles.head}>
        <View style={styles.titleWrap} pointerEvents="none">
          <Text style={styles.title}>Shop</Text>
        </View>
        <BackButton onPress={onClose} />
        {owned !== null && <Text style={styles.count}>{owned}/{total} owned</Text>}
      </View>

      <View style={styles.tabs}>
        {(['skins', 'trails', 'upgrades'] as Tab[]).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: tab === t }}>
            <Text style={[styles.tabTxt, tab === t && styles.tabTxtOn]}>{t === 'skins' ? 'Skins' : t === 'trails' ? 'Trails' : 'Upgrades'}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'skins' && (
        <CosmeticTab
          key="skins"
          items={SKINS}
          owned={save.owned}
          equipped={save.skin}
          wallet={save.wallet}
          renderIcon={(it) => {
            const k = skinById(it.id);
            return (
              <View style={styles.preview}>
                <View style={[styles.dot, { width: 8, height: 8, backgroundColor: k.trail, opacity: 0.4 }]} />
                <View style={[styles.dot, { width: 13, height: 13, backgroundColor: k.trail, opacity: 0.7 }]} />
                <View style={[styles.dot, { width: 24, height: 24, backgroundColor: k.ball, borderWidth: k.id === 'void' ? 2 : 0, borderColor: '#fff' }]} />
              </View>
            );
          }}
          renderHero={(it) => {
            const k = skinById(it.id);
            return <OrbitHero size={120} planetColor="#3a4590" ball={k.ball} trail={k.trail} trailStyle={trail.id} still={still} />;
          }}
          onBuy={(it) => spend(it.price, { owned: [...save.owned, it.id], skin: it.id })}
          onEquip={(it) => onChange({ ...save, skin: it.id })}
        />
      )}

      {tab === 'trails' && (
        <CosmeticTab
          key="trails"
          items={TRAILS}
          owned={save.trails}
          equipped={save.trail}
          wallet={save.wallet}
          renderIcon={(it) => (
            <View style={styles.trailIcon}>
              {[0, 1, 2, 3, 4].map((i) => (
                <TrailDot key={i} style={trailById(it.id).id} k={(i + 1) / 5} i={i} x={8 + i * 13} y={15} color={skin.trail} t={i * 0.1} scale={0.7} />
              ))}
            </View>
          )}
          renderHero={(it) => <OrbitHero size={120} planetColor="#3a4590" ball={skin.ball} trail={skin.trail} trailStyle={trailById(it.id).id} still={still} />}
          onBuy={(it) => spend(it.price, { trails: [...save.trails, it.id], trail: it.id })}
          onEquip={(it) => onChange({ ...save, trail: it.id })}
        />
      )}

      {tab === 'upgrades' && <UpgradesTab save={save} onBuy={(id, price) => spend(price, { upgrades: { ...save.upgrades, [id]: (save.upgrades[id] ?? 0) + 1 } })} />}
    </View>
  );
}

function CosmeticTab({ items, owned, equipped, wallet, renderIcon, renderHero, onBuy, onEquip }: {
  items: Item[];
  owned: string[];
  equipped: string;
  wallet: number;
  renderIcon: (it: Item) => ReactNode;
  renderHero: (it: Item) => ReactNode;
  onBuy: (it: Item) => void;
  onEquip: (it: Item) => void;
}) {
  const [selId, setSelId] = useState(equipped);
  const sel = items.find((k) => k.id === selId) ?? items[0];
  const has = owned.includes(sel.id);
  const on = equipped === sel.id;
  const short = sel.price - wallet;

  return (
    <>
      <ScrollView contentContainerStyle={styles.grid}>
        {items.map((k) => {
          const o = owned.includes(k.id);
          const e = equipped === k.id;
          return (
            <Pressable key={k.id} onPress={() => setSelId(k.id)} style={[styles.card, k.id === sel.id && styles.selected]} accessibilityRole="button" accessibilityState={{ selected: k.id === sel.id }} accessibilityLabel={`${k.name}${o ? ', owned' : `, ${k.price} coins`}`}>
              {renderIcon(k)}
              <Text style={styles.name}>{k.name}</Text>
              <Text style={[styles.tag, { color: e ? C.mint : o ? C.dim : C.gold }]}>{e ? 'Equipped' : o ? 'Owned' : `● ${fmt(k.price)}`}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.panel}>
        {renderHero(sel)}
        <View style={{ flex: 1, gap: 8 }}>
          <View>
            <Text style={styles.selName}>{sel.name}</Text>
            <Text style={styles.selSub}>{has ? (on ? 'Currently equipped' : 'In your collection') : `● ${fmt(sel.price)}`}</Text>
          </View>
          {on ? (
            <View style={[styles.btn, styles.btnOff]}><Text style={[styles.btnTxt, { color: C.mint }]}>Equipped</Text></View>
          ) : has ? (
            <Pressable style={[styles.btn, { backgroundColor: C.sky }]} onPress={() => onEquip(sel)} accessibilityRole="button">
              <Text style={styles.btnTxt}>Equip</Text>
            </Pressable>
          ) : short > 0 ? (
            <View style={[styles.btn, styles.btnOff]}><Text style={[styles.btnTxt, { color: C.dim }]}>Need ● {fmt(short)} more</Text></View>
          ) : (
            <Pressable style={[styles.btn, { backgroundColor: C.gold }]} onPress={() => onBuy(sel)} accessibilityRole="button" accessibilityLabel={`Buy ${sel.name} for ${sel.price} coins`}>
              <Text style={styles.btnTxt}>Buy for ● {fmt(sel.price)}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </>
  );
}

export const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.space },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 8 },
  titleWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  title: { color: C.text, fontFamily: F.display, fontWeight: '900', fontSize: 26, letterSpacing: 2 },
  count: { color: C.dim, fontFamily: F.mono, fontSize: 12, textAlign: 'right' },
  tabs: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, padding: 4, borderRadius: 16, backgroundColor: C.panel, borderWidth: 1, borderColor: C.line },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 12 },
  tabOn: { backgroundColor: C.sky },
  tabTxt: { color: C.dim, fontWeight: '800', fontSize: 14 },
  tabTxtOn: { color: C.space, fontWeight: '900' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, paddingHorizontal: 14, paddingBottom: 16 },
  card: { width: '30%', alignItems: 'center', backgroundColor: C.panel, borderRadius: 16, paddingVertical: 14, borderWidth: 2, borderColor: 'transparent' },
  selected: { borderColor: C.sky },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 30 },
  trailIcon: { width: 70, height: 30 },
  dot: { borderRadius: 20 },
  name: { color: C.text, fontWeight: '800', marginTop: 8, fontSize: 13 },
  tag: { fontFamily: F.mono, fontWeight: '700', marginTop: 3, fontSize: 12 },
  panel: { flexDirection: 'row', alignItems: 'center', gap: 14, margin: 14, marginBottom: 34, padding: 14, borderRadius: 20, backgroundColor: C.panel, borderWidth: 1, borderColor: C.line },
  selName: { color: C.text, fontFamily: F.display, fontWeight: '900', fontSize: 22 },
  selSub: { color: C.dim, fontSize: 13, marginTop: 2 },
  btn: { borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  btnOff: { backgroundColor: '#ffffff10', borderWidth: 1, borderColor: C.line },
  btnTxt: { color: C.space, fontWeight: '900', fontSize: 15 },
});
