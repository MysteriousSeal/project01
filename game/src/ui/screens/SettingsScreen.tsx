import { ReactNode, useState } from 'react';
import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { cleanName, Save, Settings } from '../../game/meta/save';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { Page, SectionLabel } from '../components/Page';
import { alpha, C, CARD, RADIUS } from '../theme';

type Props = { save: Save; onChange: (settings: Settings) => void; onRename: (name: string) => void; onAddCoins?: (amount: number) => void; account?: ReactNode };

export const DEV_COINS = 100;

const OFF_TRACK = alpha(C.text, 0.15);

export function SettingsScreen({ save, onChange, onRename, onAddCoins, account }: Props) {
  const { settings } = save;
  const [draft, setDraft] = useState(save.name);
  const [invalid, setInvalid] = useState(false);

  const commitName = () => {
    const name = cleanName(draft);
    if (draft.trim() === '' || name === null) {
      setInvalid(draft.trim() !== '');
      setDraft(save.name);
      return;
    }
    setInvalid(false);
    setDraft(name);
    if (name !== save.name) onRename(name);
  };

  return (
    <Page save={save} title="Settings">
      <SectionLabel>PROFILE</SectionLabel>
      <View style={[styles.card, styles.row]}>
        <Icon name="user-astronaut" size={20} color={C.sky} style={styles.rowIcon} />
        <View style={styles.body}>
          <Text style={styles.label}>Pilot name</Text>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onEndEditing={commitName}
            onSubmitEditing={commitName}
            placeholder="Choose a name"
            placeholderTextColor={C.dim}
            maxLength={16}
            autoCorrect={false}
            returnKeyType="done"
            style={styles.input}
            accessibilityLabel="Pilot name"
          />
          <Text style={[styles.desc, invalid && { color: C.danger }]}>
            {invalid ? '3 to 16 letters, numbers, spaces, - or _.' : 'Shown on the leaderboards.'}
          </Text>
        </View>
      </View>

      {account}

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

      {__DEV__ && onAddCoins && (
        <>
          <SectionLabel>DEVELOPER · DEV BUILDS ONLY</SectionLabel>
          <View style={[styles.card, styles.row]}>
            <Icon name="coins" size={20} color={C.gold} style={styles.rowIcon} />
            <View style={styles.body}>
              <Text style={styles.label}>Add coins</Text>
              <Text style={styles.desc}>Testing cheat. Hidden in release builds.</Text>
            </View>
            <Button label={`+${DEV_COINS}`} variant="gold" onPress={() => onAddCoins(DEV_COINS)} accessibilityLabel={`Add ${DEV_COINS} coins`} style={styles.btn} />
          </View>
        </>
      )}
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
  btn: { minWidth: 76, paddingVertical: 10 },
  input: { color: C.text, fontSize: 15, fontWeight: '700', marginTop: 6, paddingVertical: 8, paddingHorizontal: 10, borderRadius: RADIUS.sm, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
});
