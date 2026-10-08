import { describe, expect, it } from '@jest/globals';
import { CHALLENGE_TYPES, challengeTypeById } from '../../src/game/meta/challengeTypes';
import { cleanName, normalizeSave } from '../../src/game/meta/save';
import { startRun } from '../../src/game/meta/session';
import { isPlausibleRun, runRow, uuid } from '../../src/game/meta/stats';
import { createState, launchDir, planetOf, runResult, step, tap } from '../../src/game/sim/engine';
import { seededRng } from '../../src/game/sim/rng';
import { BATCH_SIZE, KeyValue, Outbox, OutboxItem } from '../../src/services/outbox';
import { StatsApi, supabaseStats } from '../../src/services/statsApi';
import { Telemetry } from '../../src/services/telemetry';
import { day, hop, MONDAY, newGame, result, runFor, saveWith } from '../helpers';

const memory = (initial: string | null = null): KeyValue & { value: string | null } => {
  const kv = {
    value: initial,
    get: async () => kv.value,
    set: async (v: string) => {
      kv.value = v;
    },
  };
  return kv;
};

const runItem = (id: string): OutboxItem => ({ table: 'runs', row: { id } });

describe('run rows', () => {
  it('records duration and cause of death from the engine', () => {
    const s = newGame();
    hop(s);
    runFor(s, 10);
    const r = runResult(s);
    expect(r.death).toBe('collapse');
    expect(r.time).toBeGreaterThan(3);
    expect(r.time).toBeLessThan(10);
  });

  it('builds a normal run row', () => {
    const { config } = startRun(saveWith(), 'normal', '', day(MONDAY))!;
    const row = runRow('id-1', config, result({ score: 12, coins: 4, perfects: 3, bestCombo: 2, planets: 9, time: 12.3456, death: 'lost' }), '2026-6-8');
    expect(row).toEqual({
      id: 'id-1', mode: 'normal', challenge_type: null, challenge_day: null, value: 12, score: 12, coins: 4, perfects: 3, best_combo: 2, planets: 9, duration_ms: 12346, death: 'lost',
    });
  });

  it('ranks daily runs by the challenge stat', () => {
    const { config } = startRun(saveWith(), 'daily', 'coins', day(MONDAY))!;
    expect(config.challenge).toEqual(challengeTypeById('coins'));
    const row = runRow('id-2', config, result({ score: 30, coins: 17, planets: 10 }), '2026-6-8');
    expect(row).toMatchObject({ mode: 'daily', challenge_type: 'coins', challenge_day: '2026-6-8', value: 17 });
  });

  it('generates RFC 4122 v4 ids', () => {
    const rng = seededRng(5);
    const ids = Array.from({ length: 200 }, () => uuid(rng));
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('run plausibility', () => {
  it('accepts every run the engine can produce, with any boost or challenge', () => {
    const configs = [
      startRun(saveWith(), 'normal', '', day(MONDAY))!.config,
      startRun(saveWith({ boosts: { headStart: 1, coins2x: 1 } }), 'normal', '', day(MONDAY))!.config,
      ...CHALLENGE_TYPES.map((t) => ({ ...startRun(saveWith(), 'normal', '', day(MONDAY))!.config, mode: 'daily' as const, challenge: t, rules: t.rules })),
    ];
    for (const config of configs) {
      for (let seed = 1; seed <= 15; seed++) {
        const s = createState(390, 844, { rng: seededRng(seed), mods: config.mods, rules: config.rules, headStart: config.headStart });
        const bot = seededRng(seed + 99);
        for (let i = 0; i < 60 * 300 && !s.dead; i++) {
          if (!s.flying) {
            const n = planetOf(s, s.cur + 1);
            const d = launchDir(s);
            const dx = n.x - s.bx;
            const dy = n.y - s.by;
            if (n.ring) n.gapAngle = Math.atan2(-dy, -dx);
            if (d.x * dx + d.y * dy > 0 && Math.abs(d.x * dy - d.y * dx) < n.r * (bot() < 0.85 ? 0.4 : 3) && bot() < 0.4) tap(s);
          }
          step(s, 1 / 60);
          s.events.length = 0;
        }
        const row = runRow(uuid(), config, runResult(s), config.mode === 'daily' ? '2026-6-8' : null);
        if (!isPlausibleRun(row)) throw new Error(`${config.challenge?.id ?? config.mode} seed ${seed}: ${JSON.stringify(row)}`);
      }
    }
  });

  it('rejects impossible runs', () => {
    const { config } = startRun(saveWith(), 'normal', '', day(MONDAY))!;
    const base = runRow('x', config, result({ score: 20, planets: 15, perfects: 5, time: 30 }), null);
    expect(isPlausibleRun(base)).toBe(true);
    expect(isPlausibleRun({ ...base, planets: 500, score: 500 })).toBe(false);
    expect(isPlausibleRun({ ...base, perfects: 99 })).toBe(false);
    expect(isPlausibleRun({ ...base, score: 3 })).toBe(false);
    expect(isPlausibleRun({ ...base, coins: -1 })).toBe(false);
    expect(isPlausibleRun({ ...base, mode: 'daily' })).toBe(false);
  });
});

describe('pilot names', () => {
  it('accepts tidy names and rejects the rest', () => {
    expect(cleanName('  Star   Hopper ')).toBe('Star Hopper');
    expect(cleanName('Ace_99-x')).toBe('Ace_99-x');
    expect(cleanName('ab')).toBeNull();
    expect(cleanName('x'.repeat(17))).toBeNull();
    expect(cleanName('drop;table')).toBeNull();
  });

  it('keeps only valid names in saves', () => {
    expect(normalizeSave({ name: 'Nova' }).name).toBe('Nova');
    expect(normalizeSave({ name: '<script>' }).name).toBe('');
  });
});

describe('Outbox', () => {
  it('persists items across restarts', async () => {
    const kv = memory();
    await new Outbox(kv).add(runItem('a'));
    const reopened = new Outbox(kv);
    const sent: string[] = [];
    await reopened.drain(async (_t, rows) => {
      sent.push(...rows.map((r) => r.id));
      return 'ok' as const;
    });
    expect(sent).toEqual(['a']);
    expect(JSON.parse(kv.value!)).toEqual([]);
  });

  it('sends in batches per table and keeps items when sending fails', async () => {
    const box = new Outbox(memory());
    for (let i = 0; i < BATCH_SIZE + 5; i++) await box.add(runItem(`r${i}`));
    await box.add({ table: 'sessions', row: { id: 's1' } });
    const calls: [string, number][] = [];
    let fail = true;
    const send = async (table: string, rows: { id: string }[]) => {
      calls.push([table, rows.length]);
      return fail ? ('retry' as const) : ('ok' as const);
    };
    await box.drain(send);
    expect(calls).toEqual([['runs', BATCH_SIZE]]);
    expect(box.size).toBe(BATCH_SIZE + 6);
    fail = false;
    calls.length = 0;
    await box.drain(send);
    expect(calls).toEqual([['runs', BATCH_SIZE], ['runs', 5], ['sessions', 1]]);
    expect(box.size).toBe(0);
  });

  it('drops the oldest items past its limit', async () => {
    const box = new Outbox(memory(), 3);
    for (const id of ['a', 'b', 'c', 'd']) await box.add(runItem(id));
    const sent: string[] = [];
    await box.drain(async (_t, rows) => {
      sent.push(...rows.map((r) => r.id));
      return 'ok' as const;
    });
    expect(sent).toEqual(['b', 'c', 'd']);
  });

  it('runs one drain at a time', async () => {
    const box = new Outbox(memory());
    await box.add(runItem('a'));
    let calls = 0;
    const send = async () => {
      calls++;
      await Promise.resolve();
      return 'ok' as const;
    };
    await Promise.all([box.drain(send), box.drain(send), box.drain(send)]);
    expect(calls).toBe(1);
  });

  it('drops only the rows the server rejects', async () => {
    const box = new Outbox(memory());
    for (const id of ['a', 'bad', 'c']) await box.add(runItem(id));
    const accepted: string[] = [];
    await box.drain(async (_t, rows) => {
      if (rows.some((r) => r.id === 'bad')) return 'reject';
      accepted.push(...rows.map((r) => r.id));
      return 'ok';
    });
    expect(accepted).toEqual(['a', 'c']);
    expect(box.size).toBe(0);
  });

  it('ignores corrupted storage', async () => {
    const box = new Outbox(memory('{not json'));
    await box.add(runItem('a'));
    expect(box.size).toBe(1);
    const junk = new Outbox(memory(JSON.stringify([{ table: 'hack', row: { id: 'x' } }, { table: 'runs', row: {} }, runItem('ok')])));
    await junk.add(runItem('b'));
    expect(junk.size).toBe(2);
  });
});

function fakeStats(): StatsApi & { inserted: [string, string[]][]; names: string[]; online: boolean } {
  const api = {
    inserted: [] as [string, string[]][],
    names: [] as string[],
    online: true,
    userId: async () => 'u1',
    insert: async (table: string, rows: Record<string, unknown>[]) => {
      if (!api.online) return 'retry' as const;
      api.inserted.push([table, rows.map((r) => String(r.id))]);
      return 'ok' as const;
    },
    leaderboard: async () => [],
    setName: async (name: string) => {
      if (!api.online) return false;
      api.names.push(name);
      return true;
    },
  };
  return api;
}

describe('Telemetry', () => {
  it('logs runs immediately when online', async () => {
    const api = fakeStats();
    const t = new Telemetry(api, new Outbox(memory()), 'ios');
    const { config } = startRun(saveWith(), 'normal', '', day(MONDAY))!;
    await t.logRun(runRow('run-1', config, result({ score: 3, planets: 2 }), null));
    expect(api.inserted).toEqual([['runs', ['run-1']]]);
  });

  it('writes one session row with its start and end time', async () => {
    const api = fakeStats();
    const kv = memory();
    let now = Date.UTC(2026, 5, 8, 10, 0, 0);
    const t = new Telemetry(api, new Outbox(kv), 'android', () => now);
    t.startSession();
    t.startSession();
    now += 90_000;
    api.online = false;
    await t.endSession();
    const queued = JSON.parse(kv.value!) as OutboxItem[];
    expect(queued).toHaveLength(1);
    expect(queued[0].row).toMatchObject({ started_at: '2026-06-08T10:00:00.000Z', ended_at: '2026-06-08T10:01:30.000Z', platform: 'android' });
    await t.endSession();
    expect(JSON.parse(kv.value!)).toHaveLength(1);
    api.online = true;
    await t.flush();
    expect(api.inserted.map(([table]) => table)).toEqual(['sessions']);
  });

  it('retries a pending rename until it succeeds', async () => {
    const api = fakeStats();
    api.online = false;
    const t = new Telemetry(api, new Outbox(memory()), 'ios');
    await t.setName('Nova');
    expect(api.names).toEqual([]);
    api.online = true;
    await t.flush();
    await t.flush();
    expect(api.names).toEqual(['Nova']);
  });
});

describe('supabaseStats adapter', () => {
  function fakeClient(session: unknown = { user: { id: 'u1' } }, rpcData: unknown = []) {
    const calls: Record<string, unknown[]> = { upsert: [], rpc: [] };
    const client = {
      auth: { getSession: async () => ({ data: { session } }) },
      from: (table: string) => ({
        upsert: async (values: unknown, opts: unknown) => {
          calls.upsert.push([table, values, opts]);
          return { error: null };
        },
      }),
      rpc: async (fn: string, args: unknown) => {
        calls.rpc.push([fn, args]);
        return { data: rpcData, error: null };
      },
    };
    return { client: client as unknown as Parameters<typeof supabaseStats>[0], calls };
  }

  it('stamps rows with the signed-in player and ignores duplicates', async () => {
    const { client, calls } = fakeClient();
    expect(await supabaseStats(client).insert('runs', [{ id: 'r1' }])).toBe('ok');
    expect(calls.upsert).toEqual([['runs', [{ id: 'r1', user_id: 'u1' }], { onConflict: 'id', ignoreDuplicates: true }]]);
  });

  it('marks data errors as permanent and network errors as retryable', async () => {
    for (const [code, expected] of [['23514', 'reject'], ['22P02', 'reject'], ['PGRST301', 'retry'], [undefined, 'retry']] as const) {
      const client = {
        auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }) },
        from: () => ({ upsert: async () => ({ error: { code } }) }),
      } as unknown as Parameters<typeof supabaseStats>[0];
      expect(await supabaseStats(client).insert('runs', [{ id: 'r1' }])).toBe(expected);
    }
  });

  it('refuses to write without a session', async () => {
    const { client, calls } = fakeClient(null);
    expect(await supabaseStats(client).insert('runs', [{ id: 'r1' }])).toBe('retry');
    expect(await supabaseStats(client).setName('Nova')).toBe(false);
    expect(calls.upsert).toEqual([]);
  });

  it('queries boards and maps rows', async () => {
    const { client, calls } = fakeClient(undefined, [{ rank: '1', display_name: 'Ace', value: 90, is_me: false }, { rank: 7, display_name: 'Me', value: 20, is_me: true }]);
    const rows = await supabaseStats(client).leaderboard({ kind: 'daily', day: '2026-6-8', type: 'coins' });
    expect(calls.rpc).toEqual([['leaderboard', { board: 'daily', board_day: '2026-6-8', board_type: 'coins', max_rows: 50 }]]);
    expect(rows).toEqual([{ rank: 1, name: 'Ace', value: 90, me: false }, { rank: 7, name: 'Me', value: 20, me: true }]);
    await supabaseStats(client).leaderboard({ kind: 'week' });
    expect(calls.rpc[1]).toEqual(['leaderboard', { board: 'week', board_day: null, board_type: null, max_rows: 50 }]);
  });

  it('renames the profile row', async () => {
    const { client, calls } = fakeClient();
    expect(await supabaseStats(client).setName('Nova')).toBe(true);
    expect(calls.upsert).toEqual([['profiles', { user_id: 'u1', display_name: 'Nova' }, { onConflict: 'user_id' }]]);
  });
});
