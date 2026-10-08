import { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Save } from '../../game/meta/save';
import { C, F, GAP, GUTTER } from '../theme';
import { TopBar } from './TopBar';

type Props = { save: Save; title: string; right?: ReactNode; scroll?: boolean; children: ReactNode };

export function Page({ save, title, right, scroll = true, children }: Props) {
  return (
    <View style={styles.root}>
      <TopBar save={save} />
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">{title}</Text>
        {typeof right === 'string' ? <Text style={styles.right}>{right}</Text> : right}
      </View>
      {scroll ? <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView> : children}
    </View>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.section}>{children}</Text>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.space },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: GUTTER, paddingTop: 2, paddingBottom: 12 },
  title: { color: C.text, fontFamily: F.display, fontWeight: '900', fontSize: 30, letterSpacing: 2 },
  right: { color: C.dim, fontFamily: F.mono, fontSize: 12, fontWeight: '700' },
  content: { paddingHorizontal: GUTTER, paddingBottom: 20, gap: GAP },
  section: { color: C.dim, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, lineHeight: 16, marginTop: 4 },
});
