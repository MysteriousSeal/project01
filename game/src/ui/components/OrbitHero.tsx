import { Animated, StyleSheet, View } from 'react-native';
import { Skin, TrailStyle } from '../../game/cosmetics';
import { useLoop } from '../hooks';
import { C } from '../theme';
import { Ball } from './Ball';
import { TrailDot, trailLength } from './TrailDot';

type Props = { size: number; planetColor: string; skin: Skin; trailStyle: TrailStyle; still: boolean };

export function OrbitHero({ size, planetColor, skin, trailStyle, still }: Props) {
  const rot = useLoop(2800, !still);
  const spin = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const R = size / 2 - 14;
  const pr = size * 0.24;
  const c = size / 2;
  const n = trailLength(trailStyle);
  const scale = Math.max(0.6, size / 230);
  const spot = (x: number, y: number, d: number, color: string) => (
    <View style={[styles.abs, { left: pr * x, top: pr * y, width: pr * d, height: pr * d, borderRadius: pr, backgroundColor: color }]} />
  );

  return (
    <View style={{ width: size, height: size }} importantForAccessibility="no-hide-descendants">
      <View style={[styles.abs, { left: 14, top: 14, width: R * 2, height: R * 2, borderRadius: R, borderWidth: 1.5, borderColor: C.line }]} />
      <View style={[styles.abs, { left: c - pr, top: c - pr, width: pr * 2, height: pr * 2, borderRadius: pr, backgroundColor: planetColor, shadowColor: planetColor, shadowOpacity: 0.7, shadowRadius: 24, shadowOffset: { width: 0, height: 0 } }]}>
        {spot(0.35, 0.3, 0.55, '#ffffff38')}
        {spot(1.15, 1.05, 0.36, '#00000026')}
        {spot(0.55, 1.35, 0.22, '#00000026')}
      </View>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: spin }] }]}>
        {Array.from({ length: n }, (_, j) => {
          const a = -Math.PI / 2 - (j + 1) * (1.4 / n);
          return <TrailDot key={j} style={trailStyle} k={1 - j / n} i={n - j} x={c + Math.cos(a) * R} y={c + Math.sin(a) * R} color={skin.trail} t={0} scale={scale} />;
        })}
        <Ball color={skin.ball} outline={skin.outline} style={[styles.abs, { left: c - 11, top: c - R - 11 }]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
});
