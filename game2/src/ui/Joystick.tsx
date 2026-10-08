import { useState } from 'react';
import { GestureResponderEvent, StyleSheet, View } from 'react-native';

const RADIUS = 56;

type Props = { onChange: (v: { x: number; y: number }) => void };

/** A floating stick: touch anywhere in its area and drag. Reports -1..1 on each axis (y down). */
export function Joystick({ onChange }: Props) {
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const start = (e: GestureResponderEvent) => {
    setOrigin({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });
    setKnob({ x: 0, y: 0 });
  };
  const move = (e: GestureResponderEvent) => {
    if (!origin) return;
    let dx = e.nativeEvent.locationX - origin.x;
    let dy = e.nativeEvent.locationY - origin.y;
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS;
      dy = (dy / len) * RADIUS;
    }
    setKnob({ x: dx, y: dy });
    onChange({ x: dx / RADIUS, y: dy / RADIUS });
  };
  const end = () => {
    setOrigin(null);
    setKnob({ x: 0, y: 0 });
    onChange({ x: 0, y: 0 });
  };

  return (
    <View
      style={styles.area}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={start}
      onResponderMove={move}
      onResponderRelease={end}
      onResponderTerminate={end}
      accessibilityLabel="Movement stick: drag to walk"
    >
      {origin ? (
        <View pointerEvents="none" style={[styles.base, { left: origin.x - RADIUS, top: origin.y - RADIUS }]}>
          <View style={[styles.knob, { transform: [{ translateX: knob.x }, { translateY: knob.y }] }]} />
        </View>
      ) : (
        <View pointerEvents="none" style={[styles.base, styles.idle]}>
          <View style={styles.knob} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  area: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '45%' },
  base: { position: 'absolute', width: RADIUS * 2, height: RADIUS * 2, borderRadius: RADIUS, borderWidth: 2, borderColor: 'rgba(255,255,255,0.55)', backgroundColor: 'rgba(43,29,16,0.18)', alignItems: 'center', justifyContent: 'center' },
  idle: { left: 48, bottom: 40, opacity: 0.6 },
  knob: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.85)' },
});
