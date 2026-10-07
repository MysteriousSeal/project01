import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Save } from '../game/save';
import { Skin, SKINS } from '../game/skins';
import { OrbitHero, useReducedMotion } from './Home';
import { TopBar } from './Screens';
import { C, F, fmt } from './theme';

export function Shop({ save, onChange, onClose, onBuy }: { save: Save; onChange: (s: Save) => void; onClose: () => void; onBuy?: () => void }) {
  const [selId, setSelId] = useState(save.skin);
  const still = useReducedMotion();
  const sel = SKINS.find((k) => k.id === selId) ?? SKINS[0];
  const owned = save.owned.includes(sel.id);
  const equipped = save.skin === sel.id;
  const short = sel.price - save.wallet;

  const buy = (k: Skin) => {
    if (save.owned.includes(k.id) || save.wallet < k.price) return;
    onChange({ ...save, wallet: save.wallet - k.price, owned: [...save.owned, k.id], skin: k.id });
    onBuy?.();
  };
  const equip = (k: Skin) => onChange({ ...save, skin: k.id });

  return (
    <View style={styles.root}>
      <TopBar save={save} />
      <View style={styles.head}>
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Skins</Text>
        <Text style={styles.count}>{save.owned.length}/{SKINS.length}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {SKINS.map((k) => {
          const has = save.owned.includes(k.id);
          const on = save.skin === k.id;
          return (
            <Pressable key={k.id} onPress={() => setSelId(k.id)} style={[styles.card, k.id === sel.id && styles.selected]} accessibilityRole="button" accessibilityState={{ selected: k.id === sel.id }} accessibilityLabel={`${k.name}${has ? ', owned' : `, ${k.price} coins`}`}>
              <View style={styles.preview}>
                <View style={[styles.dot, { width: 8, height: 8, backgroundColor: k.trail, opacity: 0.4 }]} />
                <View style={[styles.dot, { width: 13, height: 13, backgroundColor: k.trail, opacity: 0.7 }]} />
                <View style={[styles.dot, { width: 24, height: 24, backgroundColor: k.ball, borderWidth: k.id === 'void' ? 2 : 0, borderColor: '#fff' }]} />
              </View>
              <Text style={styles.name}>{k.name}</Text>
              <Text style={[styles.tag, { color: on ? C.mint : has ? C.dim : C.gold }]}>{on ? 'Equipped' : has ? 'Owned' : `● ${fmt(k.price)}`}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.panel}>
        <OrbitHero size={120} planetColor="#3a4590" ball={sel.ball} trail={sel.trail} still={still} />
        <View style={{ flex: 1, gap: 8 }}>
          <View>
            <Text style={styles.selName}>{sel.name}</Text>
            <Text style={styles.selSub}>{owned ? (equipped ? 'Flying with this one' : 'In your collection') : `● ${fmt(sel.price)}`}</Text>
          </View>
          {equipped ? (
            <View style={[styles.btn, styles.btnOff]}><Text style={[styles.btnTxt, { color: C.mint }]}>Equipped</Text></View>
          ) : owned ? (
            <Pressable style={[styles.btn, { backgroundColor: C.sky }]} onPress={() => equip(sel)} accessibilityRole="button">
              <Text style={styles.btnTxt}>Equip</Text>
            </Pressable>
          ) : short > 0 ? (
            <View style={[styles.btn, styles.btnOff]}><Text style={[styles.btnTxt, { color: C.dim }]}>Need ● {fmt(short)} more</Text></View>
          ) : (
            <Pressable style={[styles.btn, { backgroundColor: C.gold }]} onPress={() => buy(sel)} accessibilityRole="button" accessibilityLabel={`Buy ${sel.name} for ${sel.price} coins`}>
              <Text style={styles.btnTxt}>Buy for ● {fmt(sel.price)}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.space },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
  back: { color: C.sky, fontSize: 16, fontWeight: '800', width: 64 },
  title: { color: C.text, fontFamily: F.display, fontWeight: '900', fontSize: 26, letterSpacing: 2 },
  count: { color: C.dim, fontFamily: F.mono, fontSize: 13, width: 64, textAlign: 'right' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, paddingHorizontal: 14, paddingBottom: 16 },
  card: { width: '30%', alignItems: 'center', backgroundColor: C.panel, borderRadius: 16, paddingVertical: 14, borderWidth: 2, borderColor: 'transparent' },
  selected: { borderColor: C.sky },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 30 },
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
