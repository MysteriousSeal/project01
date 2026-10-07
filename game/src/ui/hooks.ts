import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, useWindowDimensions } from 'react-native';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

export function useLoop(duration: number, enabled: boolean, pingPong = false) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!enabled) {
      v.setValue(0);
      return;
    }
    const timing = (toValue: number, easing: (t: number) => number) => Animated.timing(v, { toValue, duration, easing, useNativeDriver: true });
    const anim = Animated.loop(
      pingPong ? Animated.sequence([timing(1, Easing.inOut(Easing.sin)), timing(0, Easing.inOut(Easing.sin))]) : timing(1, Easing.linear),
    );
    anim.start();
    return () => anim.stop();
  }, [enabled, duration, pingPong, v]);
  return v;
}

export const useCompact = () => useWindowDimensions().height < 760;
