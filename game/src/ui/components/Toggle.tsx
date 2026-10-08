import { Switch } from 'react-native';
import { alpha, C } from '../theme';

const OFF_TRACK = alpha(C.text, 0.15);

/** The game's on/off switch, in the theme's colors. */
export function Toggle({ value, onChange, label }: { value: boolean; onChange: (value: boolean) => void; label: string }) {
  return <Switch value={value} onValueChange={onChange} trackColor={{ false: OFF_TRACK, true: C.mint }} thumbColor={C.text} ios_backgroundColor={OFF_TRACK} accessibilityLabel={label} />;
}
