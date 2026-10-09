import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Pos } from '../../game/grid';

export type Point = { x: number; y: number };
type Rect = { left: number; top: number; width: number; height: number };

export function cellCenter(p: Pos, cell: number): Point {
  return { x: p.col * cell + cell / 2, y: p.row * cell + cell / 2 };
}

// The bar joining two points that share a row or a column — the only shape a line segment can
// take on this grid, so there's never any rotation math.
export function barBetween(a: Point, b: Point, thickness: number): Rect {
  return a.y === b.y
    ? { left: Math.min(a.x, b.x), top: a.y - thickness / 2, width: Math.abs(a.x - b.x), height: thickness }
    : { left: a.x - thickness / 2, top: Math.min(a.y, b.y), width: thickness, height: Math.abs(a.y - b.y) };
}

type Props = { cells: Pos[]; color: string; cell: number; thickness: number; opacity?: number };

// One colored line: a bar between each pair of consecutive cells plus a rounded square joint on
// every cell so corners read as smooth bends. Memoized on the `cells` array identity — puzzle
// updates replace only the line that changed, so the other lines skip re-rendering entirely.
export const PathView = memo(function PathView({ cells, color, cell, thickness, opacity = 1 }: Props) {
  if (cells.length === 0) return null;
  const centers = cells.map((c) => cellCenter(c, cell));
  return (
    <View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="none">
      {centers.slice(1).map((b, i) => (
        <View key={`s${i}`} style={[styles.bar, barBetween(centers[i], b, thickness), { backgroundColor: color }]} />
      ))}
      {centers.map((c, i) => (
        <View
          key={`j${i}`}
          style={[
            styles.bar,
            {
              left: c.x - thickness / 2,
              top: c.y - thickness / 2,
              width: thickness,
              height: thickness,
              borderRadius: thickness / 3,
              backgroundColor: color,
            },
          ]}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  bar: { position: 'absolute', borderRadius: 4 },
});
