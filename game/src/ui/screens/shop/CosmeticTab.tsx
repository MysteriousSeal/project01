import { ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Cosmetic } from '../../../game/cosmetics';
import { Button } from '../../components/Button';
import { BOTTOM_INSET, C, F, fmt, GAP, GUTTER, RADIUS } from '../../theme';

type Props = {
  items: Cosmetic[];
  owned: string[];
  equipped: string;
  wallet: number;
  renderIcon: (id: string) => ReactNode;
  renderHero: (id: string) => ReactNode;
  onBuy: (id: string) => void;
  onEquip: (id: string) => void;
};

const COLUMNS = 3;

export function CosmeticTab({ items, owned, equipped, wallet, renderIcon, renderHero, onBuy, onEquip }: Props) {
  const { width } = useWindowDimensions();
  const cardW = Math.floor((width - GUTTER * 2 - GAP * (COLUMNS - 1)) / COLUMNS);
  const [selId, setSelId] = useState(equipped);
  const sel = items.find((k) => k.id === selId) ?? items[0];
  const has = owned.includes(sel.id);
  const on = equipped === sel.id;

  return (
    <>
      <ScrollView contentContainerStyle={styles.grid}>
        {items.map((k) => {
          const o = owned.includes(k.id);
          const e = equipped === k.id;
          const selected = k.id === sel.id;
          return (
            <Pressable
              key={k.id}
              onPress={() => setSelId(k.id)}
              style={[styles.card, { width: cardW }, selected && styles.selected]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${k.name}, ${e ? 'equipped' : o ? 'owned' : `${k.price} coins`}`}
            >
              {renderIcon(k.id)}
              <Text style={styles.name}>{k.name}</Text>
              <Text style={[styles.tag, { color: e ? C.mint : o ? C.dim : C.gold }]}>{e ? 'Equipped' : o ? 'Owned' : `● ${fmt(k.price)}`}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.panel}>
        {renderHero(sel.id)}
        <View style={styles.info}>
          <View>
            <Text style={styles.selName}>{sel.name}</Text>
            <Text style={styles.selSub}>{has ? (on ? 'Currently equipped' : 'In your collection') : `● ${fmt(sel.price)}`}</Text>
          </View>
          <ActionButton item={sel} has={has} on={on} wallet={wallet} onBuy={onBuy} onEquip={onEquip} />
        </View>
      </View>
    </>
  );
}

function ActionButton({ item, has, on, wallet, onBuy, onEquip }: { item: Cosmetic; has: boolean; on: boolean; wallet: number; onBuy: (id: string) => void; onEquip: (id: string) => void }) {
  if (on) return <Button label="Equipped" variant="muted" labelColor={C.mint} />;
  if (has) return <Button label="Equip" variant="sky" onPress={() => onEquip(item.id)} />;
  if (wallet < item.price) return <Button label={`Need ● ${fmt(item.price - wallet)} more`} variant="muted" />;
  return <Button label={`Buy for ● ${fmt(item.price)}`} variant="gold" onPress={() => onBuy(item.id)} accessibilityLabel={`Buy ${item.name} for ${item.price} coins`} />;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, paddingHorizontal: GUTTER, paddingBottom: 16 },
  card: { alignItems: 'center', backgroundColor: C.panel, borderRadius: RADIUS.lg, paddingVertical: 14, borderWidth: 2, borderColor: 'transparent' },
  selected: { borderColor: C.sky },
  name: { color: C.text, fontWeight: '800', marginTop: 8, fontSize: 13 },
  tag: { fontFamily: F.mono, fontWeight: '700', marginTop: 3, fontSize: 12 },
  panel: { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: GUTTER, marginTop: 6, marginBottom: BOTTOM_INSET + 4, padding: 14, borderRadius: RADIUS.xl, backgroundColor: C.panel, borderWidth: 1, borderColor: C.line },
  info: { flex: 1, gap: 8 },
  selName: { color: C.text, fontFamily: F.display, fontWeight: '900', fontSize: 22 },
  selSub: { color: C.dim, fontSize: 13, marginTop: 2 },
});
