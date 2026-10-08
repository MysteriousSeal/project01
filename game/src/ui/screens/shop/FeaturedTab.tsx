import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { timeLeftToday } from '../../../game/meta/calendar';
import { CATALOG, cosmeticById, skinById } from '../../../game/meta/cosmetics';
import { BUNDLES, bundleOffer, dailyDeal, DEAL_DISCOUNT, MYSTERY_PRICE, mysteryPool } from '../../../game/meta/offers';
import { Save } from '../../../game/meta/save';
import { OfferItem, owns } from '../../../game/meta/shop';
import { Button } from '../../components/Button';
import { CosmeticPreview } from '../../components/CosmeticPreview';
import { Coin, Icon } from '../../components/Icon';
import { SectionLabel } from '../../components/Page';
import { alpha, C, CARD, F, fmt, GAP, GUTTER, RADIUS } from '../../theme';

type Props = {
  save: Save;
  onBuyDeal: () => void;
  onBuyBundle: (id: string) => void;
  onOpenBox: () => OfferItem | null;
  onEquip: (item: OfferItem) => void;
};

const nameOf = (it: OfferItem) => cosmeticById(it.kind, it.id)?.name ?? it.id;

export function FeaturedTab({ save, onBuyDeal, onBuyBundle, onOpenBox, onEquip }: Props) {
  const [prize, setPrize] = useState<OfferItem | null>(null);
  const deal = dailyDeal(save);
  const trailColor = skinById(save.skin).trail;
  const poolLeft = mysteryPool(save).length;

  return (
    <ScrollView contentContainerStyle={styles.list}>
      <SectionLabel>DAILY DEAL · {Math.round(DEAL_DISCOUNT * 100)}% OFF · ENDS IN {timeLeftToday(new Date()).toUpperCase()}</SectionLabel>
      {deal ? (
        <View style={[styles.card, styles.deal]}>
          <View style={styles.preview}>
            <CosmeticPreview kind={deal.kind} id={deal.id} trailColor={trailColor} />
          </View>
          <View style={styles.body}>
            <Text style={styles.kind}>{CATALOG[deal.kind].label.toUpperCase()}</Text>
            <Text style={styles.name}>{nameOf(deal)}</Text>
            <Text style={styles.was}>
              <Coin size={11} color={C.dim} /> <Text style={styles.strike}>{fmt(deal.original)}</Text>
            </Text>
          </View>
          <Button label="" price={deal.price} variant={save.wallet >= deal.price ? 'gold' : 'muted'} onPress={onBuyDeal} accessibilityLabel={`Buy ${nameOf(deal)} for ${deal.price} coins`} style={styles.btn} />
        </View>
      ) : (
        <View style={[styles.card, styles.empty]}>
          <Icon name="check" size={14} color={C.mint} />
          <Text style={styles.emptyTxt}>Deal claimed. A new one arrives tomorrow.</Text>
        </View>
      )}

      <SectionLabel>MYSTERY BOX · A RANDOM ITEM YOU DON&apos;T OWN</SectionLabel>
      <View style={[styles.card, styles.box]}>
        <View style={styles.boxIcon}>
          <Icon name="gift" size={26} color={C.pink} />
        </View>
        <View style={styles.body}>
          <Text style={styles.name}>Mystery Box</Text>
          <Text style={styles.desc}>{poolLeft ? `${poolLeft} items left to discover. Rare looks are rarer.` : 'You own everything. Collection complete!'}</Text>
        </View>
        {poolLeft > 0 && (
          <Button label="Open" price={MYSTERY_PRICE} variant={save.wallet >= MYSTERY_PRICE ? 'gold' : 'muted'} onPress={() => setPrize(onOpenBox())} style={styles.btn} />
        )}
      </View>
      {prize && (
        <View style={[styles.card, styles.prize]} accessible accessibilityLabel={`You got ${nameOf(prize)}`}>
          <View style={styles.preview}>
            <CosmeticPreview kind={prize.kind} id={prize.id} trailColor={trailColor} />
          </View>
          <View style={styles.body}>
            <Text style={styles.kind}>YOU GOT A NEW {CATALOG[prize.kind].label.toUpperCase()}</Text>
            <Text style={styles.name}>{nameOf(prize)}</Text>
          </View>
          {save[CATALOG[prize.kind].equipped] === prize.id ? (
            <Button label="Equipped" variant="muted" labelColor={C.mint} style={styles.btn} />
          ) : (
            <Button label="Equip" variant="sky" onPress={() => onEquip(prize)} style={styles.btn} />
          )}
        </View>
      )}

      <SectionLabel>BUNDLES</SectionLabel>
      {BUNDLES.map((b) => {
        const offer = bundleOffer(save, b);
        const done = offer.missing.length === 0;
        return (
          <View key={b.id} style={styles.card}>
            <View style={styles.bundleHead}>
              <View style={styles.body}>
                <Text style={styles.name}>{b.name}</Text>
                <Text style={styles.desc}>{b.tagline}</Text>
              </View>
              {!done && <Text style={styles.save}>-{Math.round(b.discount * 100)}%</Text>}
            </View>
            <View style={styles.items}>
              {b.items.map((it) => (
                <View key={`${it.kind}-${it.id}`} style={[styles.item, owns(save, it.kind, it.id) && styles.itemOwned]}>
                  <CosmeticPreview kind={it.kind} id={it.id} trailColor={trailColor} />
                  <Text style={styles.itemTxt} numberOfLines={1}>{nameOf(it)}</Text>
                </View>
              ))}
            </View>
            {done ? (
              <Button label="Owned" variant="muted" labelColor={C.mint} />
            ) : (
              <Button
                label={offer.missing.length < b.items.length ? 'Complete for' : 'Buy for'}
                price={offer.price}
                variant={save.wallet >= offer.price ? 'gold' : 'muted'}
                onPress={() => onBuyBundle(b.id)}
                accessibilityLabel={`Buy ${b.name} for ${offer.price} coins, instead of ${offer.full}`}
              />
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: GUTTER, paddingBottom: 30, gap: GAP },
  card: { ...CARD, padding: 12, gap: 10 },
  deal: { flexDirection: 'row', alignItems: 'center', borderColor: C.goldEdge, backgroundColor: C.goldWash },
  empty: { flexDirection: 'row', alignItems: 'center' },
  emptyTxt: { color: C.dim, fontSize: 13, fontWeight: '700' },
  box: { flexDirection: 'row', alignItems: 'center' },
  boxIcon: { width: 52, height: 52, borderRadius: RADIUS.md, backgroundColor: alpha(C.pink, 0.12), borderWidth: 1.5, borderColor: C.pink, alignItems: 'center', justifyContent: 'center' },
  prize: { flexDirection: 'row', alignItems: 'center', borderColor: C.mint },
  preview: { width: 76, alignItems: 'center' },
  body: { flex: 1 },
  kind: { color: C.dim, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  name: { color: C.text, fontFamily: F.display, fontWeight: '900', fontSize: 17 },
  desc: { color: C.dim, fontSize: 12, lineHeight: 16, marginTop: 2 },
  was: { color: C.dim, fontFamily: F.mono, fontSize: 12, marginTop: 2 },
  strike: { textDecorationLine: 'line-through' },
  btn: { minWidth: 88, paddingVertical: 10 },
  bundleHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  save: { color: C.space, backgroundColor: C.pink, fontWeight: '900', fontSize: 13, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm, overflow: 'hidden' },
  items: { flexDirection: 'row', gap: 6 },
  item: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 8, borderRadius: RADIUS.md, backgroundColor: C.surface },
  itemOwned: { opacity: 0.4 },
  itemTxt: { color: C.soft, fontSize: 11, fontWeight: '700' },
});
