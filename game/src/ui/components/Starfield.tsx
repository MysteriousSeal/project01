import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = { width: number; height: number; count?: number; offset?: number };

export const Starfield = memo(function Starfield({ width, height, count = 60, offset = 0 }: Props) {
  const stars = useMemo(
    () => Array.from({ length: count }, () => ({ x: Math.random(), y: Math.random(), size: Math.random() * 2 + 0.8, depth: Math.random() * 0.4 + 0.1 })),
    [count],
  );
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map((st, i) => {
        const y = (((st.y * height - offset * st.depth) % height) + height) % height;
        return <View key={i} style={[styles.star, { left: st.x * width, top: y, width: st.size, height: st.size, opacity: st.depth * 2 }]} />;
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  star: { position: 'absolute', backgroundColor: '#ffffff', borderRadius: 2 },
});
