import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C } from '../theme';
import { Icon, IconName } from './Icon';

type Props = {
  icon: IconName;
  color: string;
  label: string;
  desc?: string;
  error?: boolean;
  /** Content between the label and the description, such as a text field. */
  field?: ReactNode;
  /** Control shown on the right, such as a switch or a button. */
  children?: ReactNode;
  align?: 'center' | 'top';
};

export function SettingRow({ icon, color, label, desc, error, field, children, align = 'center' }: Props) {
  const top = align === 'top';
  return (
    <View style={[styles.row, top && styles.top]}>
      <Icon name={icon} size={top ? 18 : 20} color={color} style={[styles.icon, top && styles.iconTop]} />
      <View style={styles.body}>
        <Text style={styles.label}>{label}</Text>
        {field}
        {desc ? <Text style={[styles.desc, error && styles.error]}>{desc}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  top: { alignItems: 'flex-start' },
  icon: { width: 26, textAlign: 'center' },
  iconTop: { marginTop: 2 },
  body: { flex: 1 },
  label: { color: C.text, fontSize: 15, fontWeight: '800' },
  desc: { color: C.dim, fontSize: 12, lineHeight: 17, marginTop: 3 },
  error: { color: C.danger },
});
