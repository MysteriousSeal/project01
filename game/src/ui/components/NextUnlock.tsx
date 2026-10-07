import { Pressable, StyleSheet, Text, View } from 'react-native';
import { nextSkin } from '../../game/cosmetics';
import { Save } from '../../game/save';
import { C, fmt, RADIUS } from '../theme';
import { Ball } from './Ball';
import { Coin, Icon } from './Icon';
import { ProgressBar } from './ProgressBar';

export function NextUnlock({ save, onPress }: { save: Save; onPress: () => void }) {
  const next = nextSkin(save);
  if (!next) return null;
  const ready = save.wallet >= next.price;
  return (
    <Pressable onPress={onPress} style={[styles.row, ready && styles.ready]} accessibilityRole="button" accessibilityLabel={`Open shop. ${next.name}, ${next.price} coins`}>
      <Ball color={next.ball} size={18} outline={next.outline} />
      <View style={styles.body}>
        <Text style={styles.txt}>{ready ? `${next.name} is ready to unlock` : <>{next.name}: <Coin size={12} /> {fmt(next.price - save.wallet)} to go</>}</Text>
        <ProgressBar value={save.wallet / next.price} color={C.gold} height={4} />
      </View>
      <Text style={styles.go}>Shop <Icon name="chevron-right" size={11} color={C.sky} /></Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.line },
  ready: { borderColor: C.gold, backgroundColor: '#ffd34d14' },
  body: { flex: 1, gap: 6 },
  txt: { color: '#ffffffcc', fontSize: 13, fontWeight: '600' },
  go: { color: C.sky, fontSize: 13, fontWeight: '800' },
});
