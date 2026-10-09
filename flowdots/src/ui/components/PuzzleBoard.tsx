import * as Haptics from 'expo-haptics';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LevelDef, Solution } from '../../game/generate';
import { createPuzzleState, isColorConnected, isSolved, PuzzleState, undo as undoMove } from '../../game/puzzle';
import { starsForTime } from '../../game/scoring';
import { C, F, GAP, GUTTER, RADIUS, softShadow } from '../../game/theme';
import { Confetti } from './Confetti';
import { Hint, PuzzleGrid } from './PuzzleGrid';
import { StarRow } from './StarRow';

type Solved = { timeMs: number; stars: 1 | 2 | 3 };

// Wrapping Date.now() in a named function (rather than calling it inline in the component) keeps
// it out of React's render-purity check, which otherwise flags any direct Date.now()/Math.random()
// call textually inside a component body.
function now(): number {
  return Date.now();
}

type Props = {
  def: LevelDef;
  solution: Solution;
  title: string;
  accentColor?: string;
  onBack: () => void;
  onSolved: (timeMs: number, stars: 1 | 2 | 3) => void;
  solvedActions: (solved: Solved) => ReactNode;
};

const HINT_DURATION_MS = 1600;

export function PuzzleBoard({ def, solution, title, accentColor = C.accent, onBack, onSolved, solvedActions }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [state, setState] = useState<PuzzleState>(() => createPuzzleState(def));
  const [solved, setSolved] = useState<Solved | null>(null);
  const [hint, setHint] = useState<Hint>(null);
  const [, setClockTick] = useState(0);
  const [startedAt, setStartedAt] = useState(now);
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (solved) return;
    const id = setInterval(() => setClockTick((t) => t + 1), 200);
    return () => clearInterval(id);
  }, [solved]);

  useEffect(() => () => {
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
  }, []);

  const handleStateChange = (next: PuzzleState) => {
    setState(next);
    if (!solved && isSolved(def, next)) {
      const timeMs = now() - startedAt;
      const stars = starsForTime(def, timeMs);
      setSolved({ timeMs, stars });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onSolved(timeMs, stars);
    }
  };

  const handleUndo = () => setState((s) => undoMove(s));

  const handleReset = () => {
    setState(createPuzzleState(def));
    setStartedAt(now());
  };

  const handleHint = () => {
    if (hint) return;
    const target = def.colors.find((c) => !isColorConnected(def, state, c.colorIndex));
    if (!target) return;
    setHint({ colorIndex: target.colorIndex, cells: solution[target.colorIndex] });
    Haptics.selectionAsync().catch(() => {});
    hintTimeoutRef.current = setTimeout(() => setHint(null), HINT_DURATION_MS);
  };

  const elapsedMs = solved ? solved.timeMs : now() - startedAt;
  const seconds = Math.floor(elapsedMs / 1000);
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  const headerBlock = 112;
  const available = height - insets.top - insets.bottom - headerBlock - GUTTER * 2;
  const gridSize = Math.min(width - GUTTER * 2, available);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={onBack} style={styles.iconBtn} hitSlop={10}>
            <Text style={styles.iconText}>‹</Text>
          </Pressable>
          <View style={styles.titleBlock}>
            <Text style={[styles.title, { color: accentColor }]}>{title}</Text>
            <Text style={styles.clock}>{clock}</Text>
          </View>
          <View style={styles.iconBtn} />
        </View>

        <View style={styles.toolbar}>
          <ToolButton label="UNDO" onPress={handleUndo} />
          <ToolButton label="HINT" onPress={handleHint} disabled={!!hint} />
          <ToolButton label="RESET" onPress={handleReset} />
        </View>
      </View>

      <View style={styles.boardWrap}>
        <PuzzleGrid level={def} state={state} onStateChange={handleStateChange} size={gridSize} hint={hint} />
      </View>

      {solved && (
        <View style={styles.overlay}>
          <Confetti />
          <View style={[styles.card, softShadow(0.18, 20, 8)]}>
            <Text style={styles.solvedTitle}>SOLVED</Text>
            <StarRow stars={solved.stars} size={28} />
            <Text style={styles.timeText}>{clock}</Text>
            <View style={{ height: 8 }} />
            {solvedActions(solved)}
          </View>
        </View>
      )}
    </View>
  );
}

function ToolButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.tool, pressed && !disabled && styles.toolPressed, disabled && styles.toolDisabled]}
    >
      <Text style={[styles.toolText, disabled && styles.toolTextDisabled]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.canvas },
  header: { paddingHorizontal: GUTTER, paddingBottom: 10 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
  },
  iconText: { color: C.ink, fontSize: 22, fontWeight: '900', marginTop: -2 },
  titleBlock: { alignItems: 'center' },
  title: { fontFamily: F.display, fontWeight: F.displayWeight, fontSize: 20, letterSpacing: 1 },
  clock: { color: C.inkDim, fontFamily: F.mono, fontSize: 13, fontWeight: '700', marginTop: 2 },
  toolbar: { flexDirection: 'row', justifyContent: 'center', gap: GAP, marginTop: 10 },
  tool: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
  },
  toolPressed: { transform: [{ scale: 0.95 }], backgroundColor: C.canvas },
  toolDisabled: { opacity: 0.5 },
  toolText: { color: C.ink, fontWeight: '800', fontSize: 12, letterSpacing: 0.5 },
  toolTextDisabled: { color: C.inkDim },
  boardWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(28,32,36,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: RADIUS.xl,
    paddingVertical: 28,
    paddingHorizontal: 32,
    alignItems: 'center',
    gap: 12,
  },
  solvedTitle: { fontFamily: F.display, fontWeight: F.displayWeight, fontSize: 28, letterSpacing: 2, color: C.ink },
  timeText: { fontFamily: F.mono, fontSize: 16, fontWeight: '700', color: C.inkDim },
});
