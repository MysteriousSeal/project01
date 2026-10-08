import { describe, expect, it } from '@jest/globals';
import { allBoards, Board, BoardEntry, boardKey } from '../../src/game/meta/stats';
import { BoardStore } from '../../src/services/boardStore';

const entry = (rank: number): BoardEntry => ({ rank, name: `P${rank}`, value: 100 - rank, me: false });

function fakeApi() {
  const api = {
    calls: [] as string[],
    fail: false,
    leaderboard: async (b: Board) => {
      api.calls.push(boardKey(b));
      await Promise.resolve();
      return api.fail ? null : [entry(1)];
    },
  };
  return api;
}

describe('leaderboard boards', () => {
  it('lists every board for the day', () => {
    const boards = allBoards('2026-6-8', ['classic', 'perfect', 'coins']);
    expect(boards.map(boardKey)).toEqual(['all', 'week', 'level', 'games', 'daily:2026-6-8:classic', 'daily:2026-6-8:perfect', 'daily:2026-6-8:coins']);
  });
});

describe('BoardStore', () => {
  it('prefetches every board once and notifies listeners', async () => {
    const api = fakeApi();
    const store = new BoardStore(api);
    let notified = 0;
    store.subscribe(() => notified++);
    const boards = allBoards('d', ['a', 'b']);
    await store.loadAll(boards);
    expect(api.calls).toHaveLength(boards.length);
    expect(notified).toBe(boards.length);
    for (const b of boards) expect(store.get(boardKey(b))).toEqual([entry(1)]);
  });

  it('shares an in-flight request for the same board', async () => {
    const api = fakeApi();
    const store = new BoardStore(api);
    await Promise.all([store.load({ kind: 'all' }), store.load({ kind: 'all' }), store.load({ kind: 'all' })]);
    expect(api.calls).toEqual(['all']);
    await store.load({ kind: 'all' });
    expect(api.calls).toEqual(['all', 'all']);
  });

  it('keeps the last good list when a refresh fails, and records first failures', async () => {
    const api = fakeApi();
    const store = new BoardStore(api);
    await store.load({ kind: 'week' });
    api.fail = true;
    await store.load({ kind: 'week' });
    expect(store.get('week')).toEqual([entry(1)]);
    await store.load({ kind: 'games' });
    expect(store.get('games')).toBeNull();
    expect(store.get('level')).toBeUndefined();
  });

  it('stops notifying after unsubscribe', async () => {
    const store = new BoardStore(fakeApi());
    let notified = 0;
    const off = store.subscribe(() => notified++);
    off();
    await store.load({ kind: 'all' });
    expect(notified).toBe(0);
  });
});
