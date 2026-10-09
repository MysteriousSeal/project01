import { ReactNode, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LevelDef } from '../../game/generate';
import { canUndo, createPuzzleState, isSolved, nextHint, PuzzleState, undo } from '../../game/puzzle';
import { formatClock, Stars, starsForTime } from '../../game/scoring';
import { Chip } from '../components/Button';
import { Confetti } from '../components/Confetti';
import { StarRow } from '../components/StarRow';
import { haptic } from '../haptics';
import { C, F, GAP, GUTTER, RADIUS, softShadow } from '../theme';
import { now } from '../time';
import { Clock } from './Clock';
import { PuzzleGrid } from './PuzzleGrid';

export type SolvedResult = { timeMs: number; stars: Stars };

type Props = {
  level: LevelDef;
  title: string;
  accentColor?: string;
  onBack: () => void;
  onSolved: (result: SolvedResult) => void;
  // Screen-specific buttons for the solved card (next level vs. back home).
  solvedActions: (result: SolvedResult) => ReactNode;
};

const HINT_MS = 1600;

export function PuzzleBoard({ level, title, accentColor = C.accent, onBack, onSolved, solvedActions }: Props) {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<PuzzleState>(() => createPuzzleState(level));
  const [startedAt, setStartedAt] = useState(now);
  const [solved, setSolved] = useState<SolvedResult | null>(null);
  const [hintColor, setHintColor] = useState<number | null>(null);
  const [boardSize, setBoardSize] = useState(0);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The release right after the solving move can arrive before React re-renders, so the solve
  // is latched here rather than trusting `solved` from this render's closure.
  const solvedLatch = useRef(false);

  useEffect(() => () => clearHintTimer(hintTimer), []);

  const handleChange = (next: PuzzleState) => {
    setState(next);
    if (solvedLatch.current || !isSolved(level, next)) return;
    solvedLatch.current = true;
    const timeMs = now() - startedAt;
    const result = { timeMs, stars: starsForTime(level, timeMs) };
    setSolved(result);
    setHintColor(null);
    haptic('solved');
    onSolved(result);
  };

  const handleHint = () => {
    const color = nextHint(level, state);
    if (color === null) return;
    haptic('tap');
    setHintColor(color);
    clearHintTimer(hintTimer);
    hintTimer.current = setTimeout(() => setHintColor(null), HINT_MS);
  };

  const handleReset = () => {
    setState(createPuzzleState(level));
    setStartedAt(now());
  };

  // Size the board from the space actually left after the header, not a guessed header height.
  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBoardSize(Math.floor(Math.min(width, height)));
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + GUTTER }]}>
      <View style={styles.header}>
        <Chip label="‹" onPress={onBack} />
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: accentColor }]}>{title}</Text>
          <Clock startedAt={startedAt} frozenMs={solved?.timeMs ?? null} style={styles.clock} />
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.toolbar}>
        <Chip label="UNDO" onPress={() => setState(undo)} disabled={!canUndo(state) || !!solved} />
        <Chip label="HINT" onPress={handleHint} disabled={hintColor !== null || !!solved} />
        <Chip label="RESET" onPress={handleReset} disabled={!!solved} />
      </View>

      <View style={styles.boardArea} onLayout={handleLayout}>
        {boardSize > 0 && (
          <PuzzleGrid level={level} state={state} onChange={handleChange} size={boardSize} hintColor={hintColor} disabled={!!solved} />
        )}
      </View>

      {solved && (
        <View style={styles.overlay}>
          <Confetti />
          <View style={[styles.card, softShadow(0.18, 20, 8)]}>
            <Text style={styles.solvedTitle}>SOLVED</Text>
            <StarRow stars={solved.stars} size={28} />
            <Text style={styles.solvedTime}>{formatClock(solved.timeMs)}</Text>
            <View style={styles.actions}>{solvedActions(solved)}</View>
          </View>
        </View>
      )}
    </View>
  );
}

function clearHintTimer(timer: { current: ReturnType<typeof setTimeout> | null }) {
  if (timer.current) clearTimeout(timer.current);
  timer.current = null;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.canvas, paddingHorizontal: GUTTER },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpacer: { width: 38 },
  titleBlock: { alignItems: 'center' },
  title: { fontFamily: F.display, fontWeight: F.displayWeight, fontSize: 20, letterSpacing: 1 },
  clock: { color: C.inkDim, fontFamily: F.mono, fontSize: 13, fontWeight: '700', marginTop: 2 },
  toolbar: { flexDirection: 'row', justifyContent: 'center', gap: GAP, marginTop: 12, marginBottom: GUTTER },
  boardArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  overlay: { position: 'absolute', inset: 0, backgroundColor: C.scrim, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: C.surface,
    borderRadius: RADIUS.xl,
    paddingVertical: 28,
    paddingHorizontal: 32,
    alignItems: 'center',
    gap: 12,
  },
  solvedTitle: { fontFamily: F.display, fontWeight: F.displayWeight, fontSize: 28, letterSpacing: 2, color: C.ink },
  solvedTime: { fontFamily: F.mono, fontSize: 16, fontWeight: '700', color: C.inkDim },
  actions: { marginTop: 8, gap: 12, alignItems: 'center' },
});
