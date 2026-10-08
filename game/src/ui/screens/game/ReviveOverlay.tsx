import { useEffect, useEffectEvent, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { REVIVE_SECONDS } from '../../../game/meta/revive';
import { Button } from '../../components/Button';
import { useReducedMotion } from '../../hooks';
import { alpha, C, F, FILL, GUTTER, RADIUS } from '../../theme';

/** Taps are ignored briefly so a tap meant for the game can't buy a revive. */
const ARM_MS = 600;

type Props = { price: number; score: number; wallet: number; onRevive: () => void; onDecline: () => void };

export function ReviveOverlay({ price, score, wallet, onRevive, onDecline }: Props) {
  const still = useReducedMotion();
  const [left] = useState(() => new Animated.Value(1));
  const [pulse] = useState(() => new Animated.Value(0));
  const [armed, setArmed] = useState(false);
  const timeUp = useEffectEvent(() => onDecline());

  useEffect(() => {
    const t = setTimeout(() => setArmed(true), ARM_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const countdown = Animated.timing(left, { toValue: 0, duration: REVIVE_SECONDS * 1000, easing: Easing.linear, useNativeDriver: false });
    countdown.start(({ finished }) => finished && timeUp());
    const beat = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]));
    if (!still) beat.start();
    return () => {
      countdown.stop();
      beat.stop();
    };
  }, [left, pulse, still]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });

  return (
    <View style={styles.root} accessibilityViewIsModal>
      <View style={styles.card}>
        <Text style={styles.title} accessibilityRole="header">CONTINUE?</Text>
        <Text style={styles.score}>{score}</Text>
        <Text style={styles.sub}>Keep this run going from your last planet.</Text>
        <View style={styles.track}>
          <Animated.View style={[styles.bar, { width: left.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        </View>
        <View style={[styles.actions, !armed && styles.waiting]}>
          <Animated.View style={{ transform: [{ scale }] }}>
            <Button label="REVIVE" price={price} variant="gold" size="lg" onPress={armed ? onRevive : () => {}} accessibilityLabel={`Revive for ${price} coins. You have ${wallet}.`} />
          </Animated.View>
          <Button label="NO THANKS" variant="secondary" size="lg" onPress={armed ? onDecline : () => {}} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...FILL, backgroundColor: alpha(C.space, 0.72), alignItems: 'center', justifyContent: 'center', paddingHorizontal: GUTTER },
  card: { alignSelf: 'stretch', alignItems: 'center', gap: 12, padding: 22, borderRadius: RADIUS.xl, backgroundColor: C.panel, borderWidth: 1.5, borderColor: C.goldEdge },
  title: { color: C.gold, fontFamily: F.display, fontWeight: '900', fontSize: 26, letterSpacing: 4 },
  score: { color: C.text, fontFamily: F.display, fontWeight: '900', fontSize: 56, lineHeight: 62 },
  sub: { color: C.dim, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  track: { alignSelf: 'stretch', height: 6, borderRadius: 3, backgroundColor: C.track, overflow: 'hidden', marginTop: 4 },
  bar: { height: 6, borderRadius: 3, backgroundColor: C.gold },
  actions: { alignSelf: 'stretch', alignItems: 'center', gap: 14, marginTop: 6 },
  waiting: { opacity: 0.5 },
});
