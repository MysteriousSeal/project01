import { useEffect, useMemo } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { dotColors } from '../../game/theme';

type Particle = { dx: number; dy: number; rotate: number; color: string; size: number };

// Lives outside the component so React's purity check doesn't see Math.random() as part of render.
function createParticles(count: number): Particle[] {
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 70 + Math.random() * 130;
    return {
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance - 40,
      rotate: (Math.random() - 0.5) * 540,
      color: dotColors[Math.floor(Math.random() * dotColors.length)],
      size: 6 + Math.random() * 6,
    };
  });
}

export function Confetti({ count = 26 }: { count?: number }) {
  const particles = useMemo(() => createParticles(count), [count]);
  const progress = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 950, useNativeDriver: true }).start();
  }, [progress]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              width: p.size,
              height: p.size,
              borderRadius: p.size / 3,
              backgroundColor: p.color,
              opacity: progress.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] }),
              transform: [
                { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] }) },
                { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, p.dy + 170] }) },
                { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rotate}deg`] }) },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: { position: 'absolute', left: '50%', top: '38%' },
});
