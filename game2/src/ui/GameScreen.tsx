import { ExpoWebGLRenderingContext, GLView } from 'expo-gl';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GameScene } from '../render/GameScene';
import { generateWorld } from '../world/world';
import { Joystick } from './Joystick';

export function GameScreen({ seed }: { seed: number }) {
  const input = useRef({ x: 0, y: 0 });
  const loop = useRef<{ raf: number; scene: GameScene | null }>({ raf: 0, scene: null });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const l = loop.current;
    return () => {
      cancelAnimationFrame(l.raf);
      l.scene?.dispose();
    };
  }, []);

  const onContextCreate = (gl: ExpoWebGLRenderingContext) => {
    const scene = new GameScene(gl, generateWorld(seed));
    loop.current.scene = scene;
    let last = 0;
    const tick = (now: number) => {
      const dt = last ? (now - last) / 1000 : 0;
      last = now;
      scene.frame(dt, input.current);
      loop.current.raf = requestAnimationFrame(tick);
    };
    loop.current.raf = requestAnimationFrame(tick);
    setReady(true);
  };

  return (
    <View style={styles.root}>
      <GLView style={StyleSheet.absoluteFill} onContextCreate={onContextCreate} />
      <Joystick onChange={(v) => (input.current = v)} />
      <View style={styles.hud} pointerEvents="none">
        <Text style={styles.title}>EVENHOLD</Text>
        <Text style={styles.sub}>{ready ? `World ${seed}` : 'Shaping the land…'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f2c9a8' },
  hud: { position: 'absolute', top: 18, right: 24, alignItems: 'flex-end' },
  title: { color: '#fff7e8', fontSize: 20, fontWeight: '900', letterSpacing: 4, textShadowColor: 'rgba(43,29,16,0.45)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  sub: { color: '#fff7e8', fontSize: 12, fontWeight: '700', opacity: 0.9, textShadowColor: 'rgba(43,29,16,0.45)', textShadowRadius: 3 },
});
