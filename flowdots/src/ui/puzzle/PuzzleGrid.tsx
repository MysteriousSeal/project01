import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';
import { cellsBetween, Pos, posEqual } from '../../game/grid';
import { LevelDef } from '../../game/generate';
import {
  beginDrag,
  cellColorAt,
  clearColor,
  continueDrag,
  dragFeedback,
  endDrag,
  isColorConnected,
  PuzzleState,
} from '../../game/puzzle';
import { haptic } from '../haptics';
import { C, glow, LINE_COLORS } from '../theme';
import { barBetween, cellCenter, PathView, Point } from './PathView';

type Props = {
  level: LevelDef;
  state: PuzzleState;
  onChange: (next: PuzzleState) => void;
  size: number; // pixel width/height of the square board
  hintColor: number | null;
  disabled?: boolean;
};

const THICKNESS_RATIO = 0.6;
const DOT_RATIO = 0.82;
// Under this much movement without leaving the cell, a touch is a tap (clears the line).
const TAP_SLOP_PX = 10;

type Gesture = { start: Point; startCell: Pos; lastCell: Pos; dragging: boolean };

export function PuzzleGrid({ level, state, onChange, size, hintColor, disabled }: Props) {
  const cell = size / level.size;
  const thickness = cell * THICKNESS_RATIO;

  // PanResponder handlers are created once and fire on native touch events, not renders, so
  // they read the latest props through refs that are synced after every commit.
  const latest = useRef({ state, onChange, disabled, cell });
  useEffect(() => {
    latest.current = { state, onChange, disabled, cell };
  });

  const gestureRef = useRef<Gesture | null>(null);
  const [finger, setFinger] = useState<Point | null>(null);

  const panResponder = useMemo(() => {
    const cellAt = (pt: Point): Pos => {
      const c = latest.current.cell;
      return {
        row: Math.max(0, Math.min(level.size - 1, Math.floor(pt.y / c))),
        col: Math.max(0, Math.min(level.size - 1, Math.floor(pt.x / c))),
      };
    };
    const commit = (next: PuzzleState) => {
      const prev = latest.current.state;
      if (next === prev) return;
      const feedback = dragFeedback(level, prev, next);
      if (feedback) haptic(feedback);
      latest.current.state = next; // so the next touch event in this frame builds on it
      latest.current.onChange(next);
    };
    const finish = () => {
      gestureRef.current = null;
      setFinger(null);
    };

    // Known false positive: the linter can't tell these handlers only run on touch events, never
    // during render. Reading refs here is exactly what PanResponder's create-once design needs.
    // eslint-disable-next-line react-hooks/refs
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !latest.current.disabled,
      onMoveShouldSetPanResponder: () => !latest.current.disabled,
      onPanResponderGrant: (evt) => {
        const start = { x: evt.nativeEvent.locationX, y: evt.nativeEvent.locationY };
        const startCell = cellAt(start);
        gestureRef.current = { start, startCell, lastCell: startCell, dragging: false };
      },
      onPanResponderMove: (_evt, gs) => {
        const g = gestureRef.current;
        if (!g) return;
        // Position from the grant point plus total travel: locationX is relative to whichever
        // view is under the finger, which stops meaning "the board" once it slides off it.
        const pt = { x: g.start.x + gs.dx, y: g.start.y + gs.dy };
        const pos = cellAt(pt);
        let s = latest.current.state;

        if (!g.dragging) {
          if (Math.hypot(gs.dx, gs.dy) <= TAP_SLOP_PX && posEqual(pos, g.startCell)) return;
          g.dragging = true;
          s = beginDrag(level, s, g.startCell);
        }
        if (s.draggingColor === null) return;

        for (const step of cellsBetween(g.lastCell, pos)) s = continueDrag(level, s, step);
        g.lastCell = pos;
        commit(s);
        setFinger(pt);
      },
      onPanResponderRelease: () => {
        const g = gestureRef.current;
        const s = latest.current.state;
        if (g && !g.dragging) {
          const color = cellColorAt(level, s, g.startCell);
          if (color !== null && s.paths[color].length > 0) {
            haptic('tap');
            commit(clearColor(s, color));
          }
        } else {
          commit(endDrag(s));
        }
        finish();
      },
      onPanResponderTerminate: () => {
        commit(endDrag(latest.current.state));
        finish();
      },
    });
  }, [level]);

  const active = state.draggingColor;
  const head = active !== null ? state.paths[active][state.paths[active].length - 1] : undefined;
  const showStub = finger && head && active !== null && !isColorConnected(level, state.paths, active);

  return (
    <View style={[styles.board, { width: size, height: size }]} {...panResponder.panHandlers}>
      {/* Nothing inside may take touches, or locationX would be measured against that child. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <GridLines count={level.size} cell={cell} />
        {hintColor !== null && (
          <PathView
            cells={level.colors[hintColor].solution}
            color={LINE_COLORS[hintColor]}
            cell={cell}
            thickness={thickness / 2}
            opacity={0.4}
          />
        )}
        {state.paths.map((path, i) => (
          <PathView key={i} cells={path} color={LINE_COLORS[i]} cell={cell} thickness={thickness} />
        ))}
        {showStub && <LiveStub from={cellCenter(head, cell)} to={finger} cell={cell} thickness={thickness} color={LINE_COLORS[active]} />}
        <Endpoints level={level} cell={cell} activeColor={active} />
      </View>
    </View>
  );
}

// The short bar from the line's head toward the raw finger position, so the line visibly follows
// the finger between cells. Capped at one cell along the dominant axis: it previews the next
// step, it never pretends to cross cells the line hasn't actually entered.
function LiveStub({ from, to, cell, thickness, color }: { from: Point; to: Point; cell: number; thickness: number; color: string }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const end =
    Math.abs(dx) >= Math.abs(dy)
      ? { x: from.x + Math.sign(dx) * Math.min(Math.abs(dx), cell), y: from.y }
      : { x: from.x, y: from.y + Math.sign(dy) * Math.min(Math.abs(dy), cell) };
  return <View style={[styles.stub, barBetween(from, end, thickness), { backgroundColor: color }]} />;
}

const GridLines = memo(function GridLines({ count, cell }: { count: number; cell: number }) {
  return (
    <>
      {Array.from({ length: count - 1 }, (_, i) => (
        <View key={`v${i}`} style={[styles.lineV, { left: (i + 1) * cell }]} />
      ))}
      {Array.from({ length: count - 1 }, (_, i) => (
        <View key={`h${i}`} style={[styles.lineH, { top: (i + 1) * cell }]} />
      ))}
    </>
  );
});

const Endpoints = memo(function Endpoints({ level, cell, activeColor }: { level: LevelDef; cell: number; activeColor: number | null }) {
  const pulse = useMemo(() => new Animated.Value(1), []);
  useEffect(() => {
    if (activeColor === null) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.3, duration: 420, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 420, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      pulse.setValue(1);
    };
  }, [activeColor, pulse]);

  const dot = cell * DOT_RATIO;
  return (
    <>
      {level.colors.flatMap((c, i) =>
        [c.a, c.b].map((p, end) => {
          const { x, y } = cellCenter(p, cell);
          return (
            <Animated.View
              key={`${i}-${end}`}
              style={[
                styles.dot,
                glow(LINE_COLORS[i], 10),
                {
                  left: x - dot / 2,
                  top: y - dot / 2,
                  width: dot,
                  height: dot,
                  borderRadius: dot / 2,
                  backgroundColor: LINE_COLORS[i],
                  transform: [{ scale: i === activeColor ? pulse : 1 }],
                },
              ]}
            />
          );
        }),
      )}
    </>
  );
});

const styles = StyleSheet.create({
  board: { backgroundColor: C.surface, borderRadius: 18, overflow: 'hidden' },
  lineV: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: C.line },
  lineH: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: C.line },
  stub: { position: 'absolute', borderRadius: 4, opacity: 0.55 },
  dot: { position: 'absolute' },
});
