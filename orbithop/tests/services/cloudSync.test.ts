import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { normalizeSave, Save } from '../../src/game/meta/save';
import { resolveSave, touch } from '../../src/game/meta/sync';
import { CloudApi, supabaseCloud } from '../../src/services/backend/savesApi';
import { CloudSync } from '../../src/services/sync/cloudSync';
import { saveWith } from '../helpers';

type Fake = CloudApi & { remote: Save | null; pushes: Save[]; online: boolean; userId: string | null };

function fakeCloud(remote: Save | null = null): Fake {
  const fake: Fake = {
    remote,
    pushes: [],
    online: true,
    userId: 'player-1',
    signIn: async () => fake.userId,
    pull: async () => fake.remote,
    push: async (_id, save) => {
      if (!fake.online) return false;
      fake.pushes.push(save);
      fake.remote = save;
      return true;
    },
  };
  return fake;
}

describe('save versions', () => {
  it('touch always moves the timestamp forward', () => {
    expect(touch(saveWith({ savedAt: 0 }), 1000).savedAt).toBe(1000);
    expect(touch(saveWith({ savedAt: 5000 }), 1000).savedAt).toBe(5001);
  });

  it('keeps the newer copy and prefers local on ties', () => {
    const local = saveWith({ savedAt: 10, wallet: 1 });
    const remote = saveWith({ savedAt: 20, wallet: 2 });
    expect(resolveSave(local, remote)).toEqual({ save: remote, source: 'remote' });
    expect(resolveSave(remote, local)).toEqual({ save: remote, source: 'local' });
    expect(resolveSave(local, { ...local })).toMatchObject({ source: 'local' });
    expect(resolveSave(local, null)).toEqual({ save: local, source: 'local' });
  });

  it('stores the timestamp in the save format', () => {
    expect(normalizeSave({ savedAt: 1234.7 }).savedAt).toBe(1234);
    expect(normalizeSave({}).savedAt).toBe(0);
  });
});

describe('CloudSync', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('uploads the local save when the cloud has nothing', async () => {
    const cloud = fakeCloud();
    const sync = new CloudSync(cloud, () => {});
    await sync.start(saveWith({ savedAt: 100, wallet: 7 }));
    expect(cloud.pushes.map((s) => s.wallet)).toEqual([7]);
    expect(sync.signedIn).toBe(true);
  });

  it('adopts a newer cloud save without pushing it back', async () => {
    const cloud = fakeCloud(saveWith({ savedAt: 500, wallet: 99 }));
    const adopted: Save[] = [];
    const sync = new CloudSync(cloud, (s) => adopted.push(s));
    await sync.start(saveWith({ savedAt: 100 }));
    expect(adopted.map((s) => s.wallet)).toEqual([99]);
    expect(cloud.pushes).toHaveLength(0);
  });

  it('debounces changes into a single push', async () => {
    const cloud = fakeCloud();
    const sync = new CloudSync(cloud, () => {}, 1000);
    await sync.start(saveWith({ savedAt: 1 }));
    cloud.pushes.length = 0;
    for (let i = 2; i <= 5; i++) sync.update(saveWith({ savedAt: i, wallet: i }));
    expect(cloud.pushes).toHaveLength(0);
    await jest.advanceTimersByTimeAsync(1000);
    expect(cloud.pushes.map((s) => s.wallet)).toEqual([5]);
  });

  it('skips pushes when nothing changed', async () => {
    const cloud = fakeCloud();
    const sync = new CloudSync(cloud, () => {}, 1000);
    const save = saveWith({ savedAt: 10 });
    await sync.start(save);
    sync.update(save);
    await sync.flush();
    expect(cloud.pushes).toHaveLength(1);
  });

  it('retries after being offline', async () => {
    const cloud = fakeCloud();
    cloud.online = false;
    const sync = new CloudSync(cloud, () => {}, 1000);
    await sync.start(saveWith({ savedAt: 10, wallet: 1 }));
    expect(cloud.pushes).toHaveLength(0);
    cloud.online = true;
    await sync.flush();
    expect(cloud.pushes.map((s) => s.wallet)).toEqual([1]);
  });

  it('never runs two pushes at once and ends on the latest save', async () => {
    const cloud = fakeCloud();
    let active = 0;
    let maxActive = 0;
    const slowPush = cloud.push;
    cloud.push = async (id, save) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await Promise.resolve();
      const ok = await slowPush(id, save);
      active--;
      return ok;
    };
    const sync = new CloudSync(cloud, () => {}, 1000);
    await sync.start(saveWith({ savedAt: 1 }));
    sync.update(saveWith({ savedAt: 2, wallet: 2 }));
    const a = sync.flush();
    sync.update(saveWith({ savedAt: 3, wallet: 3 }));
    const b = sync.flush();
    await Promise.all([a, b]);
    expect(maxActive).toBe(1);
    expect(cloud.remote?.wallet).toBe(3);
  });

  it('stays local-only when sign-in fails', async () => {
    const cloud = fakeCloud();
    cloud.userId = null;
    const sync = new CloudSync(cloud, () => {}, 1000);
    await sync.start(saveWith({ savedAt: 10 }));
    sync.update(saveWith({ savedAt: 11 }));
    await jest.advanceTimersByTimeAsync(5000);
    expect(cloud.pushes).toHaveLength(0);
    expect(sync.signedIn).toBe(false);
  });

  it('does nothing after stop', async () => {
    const cloud = fakeCloud();
    const sync = new CloudSync(cloud, () => {}, 1000);
    await sync.start(saveWith({ savedAt: 1 }));
    cloud.pushes.length = 0;
    sync.update(saveWith({ savedAt: 2 }));
    sync.stop();
    await jest.advanceTimersByTimeAsync(5000);
    expect(cloud.pushes).toHaveLength(0);
  });
});

describe('supabaseCloud adapter', () => {
  function fakeClient(row: unknown, session: unknown = null) {
    const calls: Record<string, unknown[]> = { upsert: [], eq: [], anon: [] };
    const client = {
      auth: {
        getSession: async () => ({ data: { session } }),
        signInAnonymously: async () => {
          calls.anon.push(true);
          return { data: { user: { id: 'anon-1' } }, error: null };
        },
      },
      from: (table: string) => ({
        select: () => ({
          eq: (col: string, val: string) => {
            calls.eq.push([table, col, val]);
            return { maybeSingle: async () => ({ data: row, error: null }) };
          },
        }),
        upsert: async (values: unknown, opts: unknown) => {
          calls.upsert.push([table, values, opts]);
          return { error: null };
        },
      }),
    };
    return { client: client as unknown as Parameters<typeof supabaseCloud>[0], calls };
  }

  it('reuses an existing session, otherwise signs in anonymously', async () => {
    const existing = fakeClient(null, { user: { id: 'user-9' } });
    expect(await supabaseCloud(existing.client).signIn()).toBe('user-9');
    expect(existing.calls.anon).toHaveLength(0);
    const fresh = fakeClient(null);
    expect(await supabaseCloud(fresh.client).signIn()).toBe('anon-1');
    expect(fresh.calls.anon).toHaveLength(1);
  });

  it('pulls and validates the stored save', async () => {
    const { client, calls } = fakeClient({ data: { wallet: 42, skin: 'nope' }, saved_at: 777 });
    const save = await supabaseCloud(client).pull('user-9');
    expect(save?.wallet).toBe(42);
    expect(save?.skin).toBe('classic');
    expect(save?.savedAt).toBe(777);
    expect(calls.eq).toEqual([['saves', 'user_id', 'user-9']]);
  });

  it('upserts one row per player', async () => {
    const { client, calls } = fakeClient(null);
    const save = saveWith({ savedAt: 55 });
    expect(await supabaseCloud(client).push('user-9', save)).toBe(true);
    expect(calls.upsert).toEqual([['saves', { user_id: 'user-9', data: save, saved_at: 55 }, { onConflict: 'user_id' }]]);
  });
});
