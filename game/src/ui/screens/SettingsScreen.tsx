import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Save, Settings } from '../../game/save';
import { Icon } from '../components/Icon';
import { TopBar } from '../components/TopBar';
import { C, F, GAP, GUTTER, RADIUS } from '../theme';

type Props = { save: Save; onChange: (settings: Settings) => void };

export function SettingsScreen({ save, onChange }: Props) {
  const { settings } = save;
  return (
    <View style={styles.root}>
      <TopBar save={save} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title} accessibilityRole="header">Settings</Text>
        <Text style={styles.section}>GAMEPLAY</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Icon name="ghost" size={20} color={settings.ghost ? C.mint : C.dim} style={styles.rowIcon} />
            <View style={styles.body}>
              <Text style={styles.label}>Ghost of your best run</Text>
              <Text style={styles.desc}>Race a replay of your best run. In daily challenges, it replays your best attempt of the day.</Text>
            </View>
            <Switch
              value={settings.ghost}
              onValueChange={(ghost) => onChange({ ...settings, ghost })}
              trackColor={{ false: '#ffffff26', true: C.mint }}
              thumbColor={C.text}
              ios_backgroundColor="#ffffff26"
              accessibilityLabel="Ghost of your best run"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.space },
  content: { paddingHorizontal: GUTTER, paddingBottom: 20, gap: GAP },
  title: { color: C.text, fontFamily: F.display, fontWeight: '900', fontSize: 30, letterSpacing: 2, marginTop: 2 },
  section: { color: C.dim, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, lineHeight: 16, marginTop: 4 },
  card: { borderRadius: RADIUS.lg, backgroundColor: C.panel, borderWidth: 1, borderColor: C.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  rowIcon: { width: 26, textAlign: 'center' },
  body: { flex: 1 },
  label: { color: C.text, fontSize: 15, fontWeight: '800' },
  desc: { color: C.dim, fontSize: 12, lineHeight: 17, marginTop: 3 },
});
