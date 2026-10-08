import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Save } from '../../game/meta/save';
import { TROPHIES, TROPHY_COUNT, TROPHY_TIERS, tierOf, trophiesEarned, trophyProgress } from '../../game/meta/trophies';
import { Page, SectionLabel } from '../components/Page';
import { TrophyRow } from '../components/TrophyRow';
import { C, CARD, F, GAP, GUTTER } from '../theme';

export function TrophiesScreen({ save }: { save: Save }) {
  const earned = trophiesEarned(save);
  const byTier = TROPHY_TIERS.map((t, i) => ({ ...t, count: TROPHIES.filter((x) => tierOf(save, x.id) > i).length }));
  const open = TROPHIES.filter((t) => !trophyProgress(t, save).done);
  const done = TROPHIES.filter((t) => trophyProgress(t, save).done);

  return (
    <Page save={save} title="Trophies" right={`${earned}/${TROPHY_COUNT}`} scroll={false}>
      <View style={styles.summary} accessible accessibilityLabel={`${byTier.map((t) => `${t.count} ${t.name}`).join(', ')}`}>
        {byTier.map((t) => (
          <View key={t.name} style={styles.tier}>
            <Text style={[styles.count, { color: t.color }]}>{t.count}</Text>
            <Text style={styles.tierName}>{t.name.toUpperCase()}</Text>
          </View>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.list}>
        <SectionLabel>IN PROGRESS · EVERY TIER PAYS COINS</SectionLabel>
        {open.map((t) => <TrophyRow key={t.id} trophy={t} save={save} />)}

        {done.length > 0 && <SectionLabel>COMPLETE</SectionLabel>}
        {done.map((t) => <TrophyRow key={t.id} trophy={t} save={save} />)}
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  summary: { ...CARD, flexDirection: 'row', paddingVertical: 12, marginHorizontal: GUTTER, marginBottom: 4 },
  tier: { flex: 1, alignItems: 'center' },
  count: { fontFamily: F.mono, fontSize: 24, fontWeight: '900' },
  tierName: { color: C.dim, fontSize: 9, fontWeight: '900', letterSpacing: 0.8, marginTop: 2 },
  scroll: { flex: 1 },
  list: { paddingHorizontal: GUTTER, paddingTop: 6, paddingBottom: 20, gap: GAP },
});
