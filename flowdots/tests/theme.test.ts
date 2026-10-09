import { MAX_COLORS } from '../src/game/levels';
import { LINE_COLORS } from '../src/ui/theme';

// Levels index LINE_COLORS by color slot, so the palette must cover every slot a level can use,
// with no two lines sharing a color.
test('the palette has a distinct color for every possible line', () => {
  expect(LINE_COLORS.length).toBeGreaterThanOrEqual(MAX_COLORS);
  expect(new Set(LINE_COLORS.map((c) => c.toLowerCase())).size).toBe(LINE_COLORS.length);
});
