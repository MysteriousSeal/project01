import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';
import { Pos } from '../../game/grid';
import { LevelDef } from '../../game/generate';
import { beginDrag, cellColorAt, clearColor, continueDrag, endDrag, isColorConnected, PuzzleState } from '../../game/puzzle';
import { C, dotColors, glow } from '../../game/theme';

export type Hint = { colorIndex: number; cells: Pos[] } | null;

type Props = {
  level: LevelDef;
  state: PuzzleState;
  onStateChange: (next: PuzzleState) => void;
  size: number; // pixel width/height of the (square) grid
  hint?: Hint;
};

const THICKNESS_RATIO = 0.6;
const DOT_RATIO = 0.82;
// Pixel movement under this, with no cell change, is a tap (delete the line) rather than a drag.
const TAP_SLOP_PX = 10;

type GestureStart = { pos: Pos; x: number; y: number; dragging: boolean };

export function PuzzleGrid({ level, state, onStateChange, size, hint }: Props) {
  const cell = size / level.size;

  // Kept fresh via effect (not written during render) so PanResponder callbacks — which fire on
  // native touch events, not renders — always act on the latest puzzle state.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const gestureRef = useRef<GestureStart | null>(null);
  const lastCellRef = useRef<Pos | null>(null);
  const [livePoint, setLivePoint] = useState<{ x: number; y: number } | null>(null);

  const pulse = useMemo(() => new Animated.Value(1), []);
  useEffect(() => {
    if (state.draggingColor === null) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.35, duration: 420, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 420, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [state.draggingColor, pulse]);

  const posFromTouch = (x: number, y: number): Pos => ({
    row: Math.max(0, Math.min(level.size - 1, Math.floor(y / cell))),
    col: Math.max(0, Math.min(level.size - 1, Math.floor(x / cell))),
  });

  const tick = (lengthBefore: number, lengthAfter: number, justConnected: boolean) => {
    if (justConnected) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    else if (lengthAfter !== lengthBefore) Haptics.selectionAsync().catch(() => {});
  };

  const panResponder = useMemo(
    () =>
      // The refs below are only ever read inside these callbacks (on real touch events), never
      // during render — PanResponder's cross-render-stable-handlers design inherently needs that.
      // eslint-disable-next-line react-hooks/refs
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const { locationX: x, locationY: y } = evt.nativeEvent;
          gestureRef.current = { pos: posFromTouch(x, y), x, y, dragging: false };
        },
        onPanResponderMove: (evt) => {
          const g = gestureRef.current;
          if (!g) return;
          const { locationX: x, locationY: y } = evt.nativeEvent;
          const pos = posFromTouch(x, y);

          if (!g.dragging) {
            const movedPx = Math.hypot(x - g.x, y - g.y);
            const movedCell = pos.row !== g.pos.row || pos.col !== g.pos.col;
            if (movedPx <= TAP_SLOP_PX && !movedCell) return; // still undecided — could still be a tap
            g.dragging = true;
            lastCellRef.current = g.pos;
            const before = stateRef.current.paths[cellColorAt(level, stateRef.current, g.pos) ?? -1]?.length ?? 0;
            const afterBegin = beginDrag(level, stateRef.current, g.pos);
            const afterContinue = movedCell ? continueDrag(level, afterBegin, pos) : afterBegin;
            const colorIndex = afterContinue.draggingColor;
            if (colorIndex !== null) {
              tick(before, afterContinue.paths[colorIndex].length, isColorConnected(level, afterContinue, colorIndex));
            }
            stateRef.current = afterContinue;
            onStateChange(afterContinue);
            lastCellRef.current = pos;
            setLivePoint({ x, y });
            return;
          }

          setLivePoint({ x, y });
          if (lastCellRef.current && lastCellRef.current.row === pos.row && lastCellRef.current.col === pos.col) return;
          lastCellRef.current = pos;
          const colorIndex = stateRef.current.draggingColor;
          const before = colorIndex !== null ? stateRef.current.paths[colorIndex].length : 0;
          const next = continueDrag(level, stateRef.current, pos);
          if (colorIndex !== null) tick(before, next.paths[colorIndex].length, isColorConnected(level, next, colorIndex));
          stateRef.current = next;
          onStateChange(next);
        },
        onPanResponderRelease: () => {
          const g = gestureRef.current;
          gestureRef.current = null;
          lastCellRef.current = null;
          setLivePoint(null);

          if (g && !g.dragging) {
            // A plain tap (no drag) on a drawn line clears that color's path.
            const colorIndex = cellColorAt(level, stateRef.current, g.pos);
            if (colorIndex !== null && stateRef.current.paths[colorIndex].length > 0) {
              const next = clearColor(stateRef.current, colorIndex);
              stateRef.current = next;
              onStateChange(next);
            }
            return;
          }

          onStateChange(endDrag(stateRef.current));
        },
        onPanResponderTerminate: () => {
          gestureRef.current = null;
          lastCellRef.current = null;
          setLivePoint(null);
          onStateChange(endDrag(stateRef.current));
        },
      }),
    // level/cell are fixed for the lifetime of one PuzzleGrid instance (a new level remounts it).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const center = (p: Pos) => ({ x: p.col * cell + cell / 2, y: p.row * cell + cell / 2 });
  const thickness = cell * THICKNESS_RATIO;
  const dotSize = cell * DOT_RATIO;
  const draggingColor = state.draggingColor;

  return (
    <View style={[styles.grid, { width: size, height: size }]} {...panResponder.panHandlers}>
      {Array.from({ length: level.size - 1 }).map((_, i) => (
        <View key={`v${i}`} style={[styles.lineV, { left: (i + 1) * cell }]} />
      ))}
      {Array.from({ length: level.size - 1 }).map((_, i) => (
        <View key={`h${i}`} style={[styles.lineH, { top: (i + 1) * cell }]} />
      ))}

      {hint && (
        <View pointerEvents="none">
          {hint.cells.slice(0, -1).map((p, i) => {
            const a = center(p);
            const b = center(hint.cells[i + 1]);
            const horizontal = a.y === b.y;
            return (
              <View
                key={i}
                style={[
                  styles.hintSegment,
                  horizontal
                    ? { left: Math.min(a.x, b.x), top: a.y - thickness / 4, width: cell, height: thickness / 2 }
                    : { left: a.x - thickness / 4, top: Math.min(a.y, b.y), width: thickness / 2, height: cell },
                  { backgroundColor: dotColors[hint.colorIndex] },
                ]}
              />
            );
          })}
        </View>
      )}

      {level.colors.map((c) => {
        const path = state.paths[c.colorIndex];
        const color = dotColors[c.colorIndex];
        return (
          <View key={c.colorIndex} pointerEvents="none">
            {path.slice(0, -1).map((p, i) => {
              const a = center(p);
              const b = center(path[i + 1]);
              const horizontal = a.y === b.y;
              return (
                <View
                  key={i}
                  style={[
                    styles.segment,
                    horizontal
                      ? { left: Math.min(a.x, b.x), top: a.y - thickness / 2, width: cell, height: thickness }
                      : { left: a.x - thickness / 2, top: Math.min(a.y, b.y), width: thickness, height: cell },
                    { backgroundColor: color },
                  ]}
                />
              );
            })}
            {path.map((p, i) => {
              const pt = center(p);
              return (
                <View
                  key={`n${i}`}
                  style={[
                    styles.node,
                    {
                      left: pt.x - thickness / 2,
                      top: pt.y - thickness / 2,
                      width: thickness,
                      height: thickness,
                      borderRadius: thickness / 3,
                      backgroundColor: color,
                    },
                  ]}
                />
              );
            })}
            {draggingColor === c.colorIndex && livePoint && path.length > 0 && (
              <LiveStub from={center(path[path.length - 1])} to={livePoint} thickness={thickness} color={color} />
            )}
          </View>
        );
      })}

      {level.colors.flatMap((c) => [c.a, c.b]).map((p, i) => {
        const pt = center(p);
        const colorIndex = level.colors[Math.floor(i / 2)].colorIndex;
        const color = dotColors[colorIndex];
        const isPulsing = draggingColor === colorIndex;
        return (
          <Animated.View
            key={`dot${i}`}
            pointerEvents="none"
            style={[
              styles.dot,
              glow(color, 10) as object,
              {
                left: pt.x - dotSize / 2,
                top: pt.y - dotSize / 2,
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor: color,
                transform: [{ scale: isPulsing ? pulse : 1 }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

// The segment trailing from the last committed cell to the raw finger position, clamped so it
// never overshoots the straight line the gesture is actually allowed to draw — this is what makes
// the pipe feel like it's following your finger instead of snapping cell to cell.
function LiveStub({ from, to, thickness, color }: { from: { x: number; y: number }; to: { x: number; y: number }; thickness: number; color: string }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const horizontal = Math.abs(dx) >= Math.abs(dy);
  const style = horizontal
    ? { left: Math.min(from.x, to.x), top: from.y - thickness / 2, width: Math.abs(dx), height: thickness }
    : { left: from.x - thickness / 2, top: Math.min(from.y, to.y), width: thickness, height: Math.abs(dy) };
  return <View style={[styles.segment, style, { backgroundColor: color, opacity: 0.55 }]} />;
}

const styles = StyleSheet.create({
  grid: {
    backgroundColor: C.surface,
    borderRadius: 18,
    overflow: 'hidden',
  },
  lineV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: C.line },
  lineH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: C.line },
  segment: { position: 'absolute', borderRadius: 4 },
  hintSegment: { position: 'absolute', borderRadius: 4, opacity: 0.35 },
  node: { position: 'absolute' },
  dot: { position: 'absolute' },
});
