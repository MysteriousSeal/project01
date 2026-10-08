import { StyleSheet, Switch, Text, View } from 'react-native';
import { Save, Settings } from '../../game/meta/save';
import { Icon } from '../components/Icon';
import { Page, SectionLabel } from '../components/Page';
import { alpha, C, CARD } from '../theme';

type Props = { save: Save; onChange: (settings: Settings) => void };

const OFF_TRACK = alpha(C.text, 0.15);

export function SettingsScreen({ save, onChange }: Props) {
  const { settings } = save;
  return (
    <Page save={save} title="Settings">
      <SectionLabel>GAMEPLAY</SectionLabel>
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
            trackColor={{ false: OFF_TRACK, true: C.mint }}
            thumbColor={C.text}
            ios_backgroundColor={OFF_TRACK}
            accessibilityLabel="Ghost of your best run"
          />
        </View>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  card: { ...CARD },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  rowIcon: { width: 26, textAlign: 'center' },
  body: { flex: 1 },
  label: { color: C.text, fontSize: 15, fontWeight: '800' },
  desc: { color: C.dim, fontSize: 12, lineHeight: 17, marginTop: 3 },
});
