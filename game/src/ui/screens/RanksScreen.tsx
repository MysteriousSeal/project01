import { useEffect, useEffectEvent, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { dayKey } from '../../game/meta/calendar';
import { MEDAL_TIERS } from '../../game/meta/challenge';
import { challengeTypesFor, statUnit } from '../../game/meta/challengeTypes';
import { Save } from '../../game/meta/save';
import { Board, BoardEntry, boardValue } from '../../game/meta/stats';
import { statsApi } from '../../services/useTelemetry';
import { Coin, Icon } from '../components/Icon';
import { Page, SectionLabel } from '../components/Page';
import { alpha, C, CARD, F, RADIUS } from '../theme';

type Scope = 'all' | 'week' | 'daily' | 'level' | 'games';
const SCOPES: { id: Scope; label: string }[] = [
  { id: 'all', label: 'Best' },
  { id: 'week', label: 'Week' },
  { id: 'daily', label: 'Daily' },
  { id: 'level', label: 'Level' },
  { id: 'games', label: 'Games' },
];

const HEADINGS: Record<Exclude<Scope, 'daily'>, string> = {
  all: 'BEST SCORE EVER',
  week: 'BEST SCORE SINCE MONDAY',
  level: 'HIGHEST LEVEL · RANKED BY TOTAL XP',
  games: 'MOST GAMES PLAYED',
};

type Loaded = { key: string; rows: BoardEntry[] | null };

const boardKey = (b: Board) => (b.kind === 'daily' ? `daily:${b.day}:${b.type}` : b.kind);

export function RanksScreen({ save }: { save: Save }) {
  const today = new Date();
  const types = challengeTypesFor(today);
  const [scope, setScope] = useState<Scope>('all');
  const [typeId, setTypeId] = useState(types[0].id);
  const [nonce, setNonce] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  const board: Board = scope === 'daily' ? { kind: 'daily', day: dayKey(today), type: typeId } : { kind: scope };
  const key = `${boardKey(board)}#${nonce}`;
  const type = scope === 'daily' ? types.find((t) => t.id === typeId) : undefined;
  const coins = type?.stat === 'coins';

  const fetchBoard = useEffectEvent(() => statsApi?.leaderboard(board).catch(() => null) ?? Promise.resolve(null));

  useEffect(() => {
    if (!statsApi) return;
    let alive = true;
    fetchBoard().then((rows) => {
      if (alive) setLoaded({ key, rows });
    });
    return () => {
      alive = false;
    };
  }, [key]);

  const status = !statsApi ? 'offline' : loaded?.key !== key ? 'loading' : loaded.rows === null ? 'error' : loaded.rows.length ? 'ready' : 'empty';
  const rows = status === 'ready' ? loaded!.rows! : [];
  const me = rows.find((r) => r.me);

  const refresh = (
    <Pressable onPress={() => setNonce((n) => n + 1)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Refresh leaderboard">
      <Icon name="rotate-right" size={16} color={C.sky} />
    </Pressable>
  );

  return (
    <Page save={save} title="Ranks" right={statsApi ? refresh : undefined}>
      <View style={styles.tabs} accessibilityRole="tablist">
        {SCOPES.map((s) => (
          <Pressable key={s.id} onPress={() => setScope(s.id)} style={[styles.tab, scope === s.id && styles.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: scope === s.id }}>
            <Text style={[styles.tabTxt, scope === s.id && styles.tabTxtOn]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {s.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {scope === 'daily' && (
        <View style={styles.chips}>
          {types.map((t) => (
            <Pressable key={t.id} onPress={() => setTypeId(t.id)} style={[styles.chip, typeId === t.id && styles.chipOn]} accessibilityRole="button" accessibilityState={{ selected: typeId === t.id }}>
              <Icon name={t.icon} size={12} color={typeId === t.id ? C.space : C.gold} />
              <Text style={[styles.chipTxt, typeId === t.id && styles.chipTxtOn]} numberOfLines={1}>{t.name}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <SectionLabel>
        {scope === 'daily' ? `TODAY · RANKED BY ${type ? statUnit(type).toUpperCase() : 'SCORE'}` : HEADINGS[scope]}
        {me ? `  ·  YOU ARE #${me.rank}` : ''}
      </SectionLabel>

      {status === 'offline' && <Note icon="wifi" text="Leaderboards need an online connection to the game server." />}
      {status === 'loading' && <Note icon="rotate-right" text="Loading ranks…" />}
      {status === 'error' && <Note icon="wifi" text="Couldn't load ranks. Check your connection and tap refresh." />}
      {status === 'empty' && <Note icon="trophy" text="No scores yet. Play a run to take the top spot!" />}

      {rows.map((r, i) => {
        const gap = i > 0 && r.rank - rows[i - 1].rank > 1 && r.me;
        return (
          <View key={`${r.rank}-${r.name}-${i}`}>
            {gap && <Text style={styles.gap}>⋯</Text>}
            <Row entry={r} board={board} coins={coins} />
          </View>
        );
      })}
    </Page>
  );
}

function Row({ entry, board, coins }: { entry: BoardEntry; board: Board; coins: boolean }) {
  const medal = entry.rank <= MEDAL_TIERS.length ? MEDAL_TIERS[MEDAL_TIERS.length - entry.rank] : undefined;
  const shown = boardValue(board, entry.value, coins);
  return (
    <View style={[styles.row, entry.me && styles.rowMe]} accessible accessibilityLabel={`Rank ${entry.rank}, ${entry.name}${entry.me ? ' (you)' : ''}, ${shown.main}${shown.sub ? ` ${shown.sub}` : ''}`}>
      <View style={[styles.rank, medal && { backgroundColor: medal.color }]}>
        <Text style={[styles.rankTxt, medal && { color: C.space }]}>{entry.rank}</Text>
      </View>
      <Text style={[styles.name, entry.me && { color: C.mint }]} numberOfLines={1}>
        {entry.name}
        {entry.me ? '  (you)' : ''}
      </Text>
      <View style={styles.valueBox}>
        <Text style={styles.value}>
          {coins && <Coin size={12} />} {shown.main}
        </Text>
        {shown.sub && !coins && <Text style={styles.sub}>{shown.sub}</Text>}
      </View>
    </View>
  );
}

function Note({ icon, text }: { icon: 'wifi' | 'trophy' | 'rotate-right'; text: string }) {
  return (
    <View style={[styles.row, styles.note]}>
      <Icon name={icon} size={14} color={C.dim} />
      <Text style={styles.noteTxt}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', padding: 4, gap: 2, ...CARD },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: RADIUS.sm + 2 },
  tabOn: { backgroundColor: C.sky },
  tabTxt: { color: C.dim, fontWeight: '800', fontSize: 12 },
  tabTxtOn: { color: C.space, fontWeight: '900' },
  chips: { flexDirection: 'row', gap: 6 },
  chip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 6, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.goldEdge, backgroundColor: C.goldWash },
  chipOn: { backgroundColor: C.gold, borderColor: C.gold },
  chipTxt: { color: C.gold, fontSize: 12, fontWeight: '800', flexShrink: 1 },
  chipTxtOn: { color: C.space },
  row: { ...CARD, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12 },
  rowMe: { borderColor: C.mint, backgroundColor: alpha(C.mint, 0.08) },
  rank: { minWidth: 32, height: 28, paddingHorizontal: 6, borderRadius: 8, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  rankTxt: { color: C.text, fontFamily: F.mono, fontWeight: '900', fontSize: 13 },
  name: { flex: 1, color: C.text, fontSize: 15, fontWeight: '800' },
  valueBox: { alignItems: 'flex-end' },
  value: { color: C.text, fontFamily: F.mono, fontSize: 15, fontWeight: '800' },
  sub: { color: C.dim, fontFamily: F.mono, fontSize: 10, fontWeight: '700' },
  gap: { color: C.dim, textAlign: 'center', fontSize: 16, lineHeight: 16 },
  note: { gap: 10 },
  noteTxt: { flex: 1, color: C.dim, fontSize: 13, fontWeight: '600', lineHeight: 18 },
});
