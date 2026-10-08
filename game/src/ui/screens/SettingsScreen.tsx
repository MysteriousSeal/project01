import { ReactNode, useState } from 'react';
import { StyleSheet, Switch, TextInput, View } from 'react-native';
import { cleanName, Save, Settings } from '../../game/meta/save';
import { Button } from '../components/Button';
import { Page, SectionLabel } from '../components/Page';
import { SettingRow } from '../components/SettingRow';
import { alpha, C, CARD, FIELD } from '../theme';

type Props = { save: Save; onChange: (settings: Settings) => void; onRename: (name: string) => void; onAddCoins?: (amount: number) => void; onResetAttempts?: () => void; account?: ReactNode };

export const DEV_COINS = 100;

const OFF_TRACK = alpha(C.text, 0.15);

export function SettingsScreen({ save, onChange, onRename, onAddCoins, onResetAttempts, account }: Props) {
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
      <View style={styles.card}>
        <SettingRow
          icon="user-astronaut"
          color={C.sky}
          label="Pilot name"
          desc={invalid ? '3 to 16 letters, numbers, spaces, - or _.' : 'Shown on the leaderboards.'}
          error={invalid}
          field={
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
          }
        />
      </View>

      {account}

      <SectionLabel>GAMEPLAY</SectionLabel>
      <View style={styles.card}>
        <SettingRow
          icon="ghost"
          color={settings.ghost ? C.mint : C.dim}
          label="Ghost of your best run"
          desc="Race a replay of your best run. In daily challenges, it replays your best attempt of the day."
        >
          <Switch
            value={settings.ghost}
            onValueChange={(ghost) => onChange({ ...settings, ghost })}
            trackColor={{ false: OFF_TRACK, true: C.mint }}
            thumbColor={C.text}
            ios_backgroundColor={OFF_TRACK}
            accessibilityLabel="Ghost of your best run"
          />
        </SettingRow>
      </View>

      {__DEV__ && (onAddCoins || onResetAttempts) && <SectionLabel>DEVELOPER · DEV BUILDS ONLY</SectionLabel>}
      {__DEV__ && onAddCoins && (
        <View style={styles.card}>
          <SettingRow icon="coins" color={C.gold} label="Add coins" desc="Testing cheat. Hidden in release builds.">
            <Button label={`+${DEV_COINS}`} variant="gold" onPress={() => onAddCoins(DEV_COINS)} accessibilityLabel={`Add ${DEV_COINS} coins`} style={styles.btn} />
          </SettingRow>
        </View>
      )}
      {__DEV__ && onResetAttempts && (
        <View style={styles.card}>
          <SettingRow icon="rotate-right" color={C.gold} label="Reset daily attempts" desc="Gives back all attempts for today's challenges. Best scores and medals stay.">
            <Button label="Reset" variant="gold" onPress={onResetAttempts} accessibilityLabel="Reset daily challenge attempts" style={styles.btn} />
          </SettingRow>
        </View>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  card: { ...CARD, padding: 14 },
  btn: { minWidth: 76, paddingVertical: 10 },
  input: { ...FIELD, marginTop: 6, paddingVertical: 8, paddingHorizontal: 10 },
});
