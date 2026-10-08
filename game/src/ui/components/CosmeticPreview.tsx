import { StyleSheet, View } from 'react-native';
import { CosmeticKind, skinById, themeById, trailById } from '../../game/meta/cosmetics';
import { C } from '../theme';
import { Ball } from './Ball';
import { TrailDot } from './TrailDot';

type Props = { kind: CosmeticKind; id: string; trailColor?: string };

export function CosmeticPreview({ kind, id, trailColor = C.sky }: Props) {
  if (kind === 'skin') {
    const k = skinById(id);
    return (
      <View style={styles.row}>
        <View style={[styles.dot, { width: 8, height: 8, backgroundColor: k.trail, opacity: 0.4 }]} />
        <View style={[styles.dot, { width: 13, height: 13, backgroundColor: k.trail, opacity: 0.7 }]} />
        <Ball color={k.ball} size={24} outline={k.outline} glow={false} />
      </View>
    );
  }
  if (kind === 'trail') {
    const style = trailById(id).id;
    return (
      <View style={styles.strip}>
        {[0, 1, 2, 3, 4].map((i) => <TrailDot key={i} style={style} k={(i + 1) / 5} i={i} x={8 + i * 13} y={15} color={trailColor} t={i * 0.1} scale={0.7} />)}
      </View>
    );
  }
  const theme = themeById(id);
  return (
    <View style={styles.swatches}>
      {theme.swatch.map((color, i) => <View key={i} style={[styles.swatch, { backgroundColor: color, marginLeft: i ? -6 : 0 }]} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 30 },
  strip: { width: 70, height: 30 },
  swatches: { flexDirection: 'row', alignItems: 'center', height: 30 },
  dot: { borderRadius: 20 },
  swatch: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.panel },
});
