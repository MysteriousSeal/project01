import { describe, expect, it } from '@jest/globals';
import { progressSummary, recommendedSource } from '../../src/game/meta/sync';
import { authMessage, supabaseAccount } from '../../src/services/backend/accountApi';
import { CloudApi } from '../../src/services/backend/savesApi';
import { CloudSync } from '../../src/services/sync/cloudSync';
import { saveWith } from '../helpers';

type User = { id: string; is_anonymous?: boolean; email?: string; identities?: { provider: string }[] };
type Err = { code: string; message: string } | null;

function fakeAuth(start: User | null, script: Partial<Record<'linkIdentity' | 'signInWithIdToken' | 'updateUser' | 'signInWithOtp' | 'verifyOtp', { error: Err; user?: User }>>) {
  let user = start;
  const calls: [string, unknown][] = [];
  const step = (name: keyof typeof script) => async (args: unknown) => {
    calls.push([name, args]);
    const r = script[name] ?? { error: null };
    if (!r.error && r.user) user = r.user;
    return { data: {}, error: r.error };
  };
  const client = {
    auth: {
      getSession: async () => ({ data: { session: user ? { user } : null } }),
      linkIdentity: step('linkIdentity'),
      signInWithIdToken: step('signInWithIdToken'),
      updateUser: step('updateUser'),
      signInWithOtp: step('signInWithOtp'),
      verifyOtp: step('verifyOtp'),
    },
  };
  return { api: supabaseAccount(client as unknown as Parameters<typeof supabaseAccount>[0]), calls };
}

const guest: User = { id: 'guest-1', is_anonymous: true, identities: [] };

describe('account status', () => {
  it('describes guests and linked accounts', async () => {
    expect(await fakeAuth(guest, {}).api.current()).toEqual({ userId: 'guest-1', guest: true, email: null, providers: [] });
    const linked = { id: 'u1', is_anonymous: false, email: 'a@b.co', identities: [{ provider: 'anonymous' }, { provider: 'email' }] };
    expect(await fakeAuth(linked, {}).api.current()).toEqual({ userId: 'u1', guest: false, email: 'a@b.co', providers: ['email'] });
    expect(await fakeAuth(null, {}).api.current()).toBeNull();
  });
});

describe('Sign in with Apple', () => {
  it('upgrades a guest in place', async () => {
    const { api, calls } = fakeAuth(guest, { linkIdentity: { error: null, user: { ...guest, is_anonymous: false } } });
    expect(await api.withApple('tok')).toEqual({ status: 'linked' });
    expect(calls).toEqual([['linkIdentity', { provider: 'apple', token: 'tok' }]]);
  });

  it('switches to the existing account when the Apple ID is already used', async () => {
    const { api, calls } = fakeAuth(guest, {
      linkIdentity: { error: { code: 'identity_already_exists', message: 'exists' } },
      signInWithIdToken: { error: null, user: { id: 'owner-9', is_anonymous: false } },
    });
    expect(await api.withApple('tok')).toEqual({ status: 'switched' });
    expect(calls.map(([n]) => n)).toEqual(['linkIdentity', 'signInWithIdToken']);
  });

  it('reports other errors without switching', async () => {
    const { api, calls } = fakeAuth(guest, { linkIdentity: { error: { code: 'manual_linking_disabled', message: 'x' } } });
    expect(await api.withApple('tok')).toEqual({ status: 'error', message: "Account linking isn't enabled on the server yet." });
    expect(calls).toHaveLength(1);
  });
});

describe('email codes', () => {
  it('links an email to a guest with an email-change code', async () => {
    const { api, calls } = fakeAuth(guest, { verifyOtp: { error: null, user: { ...guest, is_anonymous: false, email: 'a@b.co' } } });
    expect(await api.sendEmailCode('a@b.co')).toEqual({ status: 'code-sent', mode: 'link' });
    expect(await api.verifyEmailCode('a@b.co', ' 123456 ', 'link')).toEqual({ status: 'linked' });
    expect(calls).toEqual([
      ['updateUser', { email: 'a@b.co' }],
      ['verifyOtp', { email: 'a@b.co', token: '123456', type: 'email_change' }],
    ]);
  });

  it('signs in to the existing account when the email is taken', async () => {
    const { api, calls } = fakeAuth(guest, {
      updateUser: { error: { code: 'email_exists', message: 'taken' } },
      verifyOtp: { error: null, user: { id: 'owner-9', is_anonymous: false, email: 'a@b.co' } },
    });
    expect(await api.sendEmailCode('a@b.co')).toEqual({ status: 'code-sent', mode: 'signin' });
    expect(await api.verifyEmailCode('a@b.co', '654321', 'signin')).toEqual({ status: 'switched' });
    expect(calls).toEqual([
      ['updateUser', { email: 'a@b.co' }],
      ['signInWithOtp', { email: 'a@b.co', options: { shouldCreateUser: false } }],
      ['verifyOtp', { email: 'a@b.co', token: '654321', type: 'email' }],
    ]);
  });

  it('turns auth errors into friendly messages', async () => {
    const { api } = fakeAuth(guest, { updateUser: { error: { code: 'over_email_send_rate_limit', message: 'rate' } } });
    expect(await api.sendEmailCode('a@b.co')).toEqual({ status: 'error', message: 'Too many emails were sent. Try again in a few minutes.' });
    expect(authMessage({ code: 'weird', message: 'Raw message' })).toBe('Raw message');
  });
});

describe('choosing progress after switching accounts', () => {
  const cloud = (remote: ReturnType<typeof saveWith>): CloudApi & { pushed: number[] } => {
    const api = {
      pushed: [] as number[],
      signIn: async () => 'owner-9',
      pull: async () => remote,
      push: async (_id: string, s: ReturnType<typeof saveWith>) => {
        api.pushed.push(s.wallet);
        return true;
      },
    };
    return api;
  };

  it('summarizes and recommends the side with more progress', () => {
    const small = saveWith({ xp: 50, wallet: 20, best: 5 });
    const big = saveWith({ xp: 5000, wallet: 900, best: 80, skins: ['classic', 'ember'] });
    expect(progressSummary(big)).toMatchObject({ wallet: 900, best: 80, items: 1 });
    expect(recommendedSource(small, big)).toBe('remote');
    expect(recommendedSource(big, small)).toBe('local');
  });

  it('adopts the account save when chosen, even if this phone is newer', async () => {
    const remote = saveWith({ savedAt: 10, wallet: 900 });
    const api = cloud(remote);
    const adopted: number[] = [];
    await new CloudSync(api, (s) => adopted.push(s.wallet)).start(saveWith({ savedAt: 99_999, wallet: 3 }), async () => 'remote');
    expect(adopted).toEqual([900]);
    expect(api.pushed).toEqual([]);
  });

  it('keeps this phone when chosen and makes it newer than the account copy', async () => {
    const remote = saveWith({ savedAt: Date.now() + 60_000, wallet: 900 });
    const api = cloud(remote);
    const adopted: ReturnType<typeof saveWith>[] = [];
    await new CloudSync(api, (s) => adopted.push(s)).start(saveWith({ savedAt: 5, wallet: 3 }), async () => 'local');
    expect(adopted[0].wallet).toBe(3);
    expect(adopted[0].savedAt).toBeGreaterThan(remote.savedAt);
    expect(api.pushed).toEqual([3]);
  });

  it('skips the question when the account has no save yet', async () => {
    const api = cloud(null as unknown as ReturnType<typeof saveWith>);
    let asked = false;
    await new CloudSync(api, () => {}).start(saveWith({ savedAt: 5, wallet: 3 }), async () => {
      asked = true;
      return 'remote';
    });
    expect(asked).toBe(false);
    expect(api.pushed).toEqual([3]);
  });
});
