import type { AuthError, SupabaseClient } from '@supabase/supabase-js';

export type Account = { userId: string; guest: boolean; email: string | null; providers: string[] };
export type AuthResult = { status: 'linked' | 'switched' | 'cancelled' } | { status: 'error'; message: string };
export type EmailMode = 'link' | 'signin';
export type EmailStep = { status: 'code-sent'; mode: EmailMode } | { status: 'error'; message: string };

const MESSAGES: Record<string, string> = {
  over_email_send_rate_limit: 'Too many emails were sent. Try again in a few minutes.',
  otp_expired: 'That code is wrong or has expired. Request a new one.',
  email_address_invalid: "That email address doesn't look right.",
  manual_linking_disabled: "Account linking isn't enabled on the server yet.",
  user_not_found: 'No account uses that email yet.',
};

export const authMessage = (e: Pick<AuthError, 'code' | 'message'>) => (e.code && MESSAGES[e.code]) || e.message || 'Something went wrong. Try again.';

const fail = (e: Pick<AuthError, 'code' | 'message'>): AuthResult => ({ status: 'error', message: authMessage(e) });

export type AccountApi = {
  current: () => Promise<Account | null>;
  withApple: (idToken: string) => Promise<AuthResult>;
  sendEmailCode: (email: string) => Promise<EmailStep>;
  verifyEmailCode: (email: string, code: string, mode: EmailMode) => Promise<AuthResult>;
};

export function supabaseAccount(client: SupabaseClient): AccountApi {
  const current = async (): Promise<Account | null> => {
    const user = (await client.auth.getSession()).data.session?.user;
    if (!user) return null;
    return {
      userId: user.id,
      guest: user.is_anonymous === true,
      email: user.email ?? null,
      providers: (user.identities ?? []).map((i) => i.provider).filter((p) => p !== 'anonymous'),
    };
  };

  const outcome = async (before: string | null): Promise<AuthResult> => ((await current())?.userId === before ? { status: 'linked' } : { status: 'switched' });

  return {
    current,

    async withApple(idToken) {
      const me = await current();
      if (me?.guest) {
        const { error } = await client.auth.linkIdentity({ provider: 'apple', token: idToken });
        if (!error) return outcome(me.userId);
        if (error.code !== 'identity_already_exists') return fail(error);
      }
      const { error } = await client.auth.signInWithIdToken({ provider: 'apple', token: idToken });
      return error ? fail(error) : outcome(me?.userId ?? null);
    },

    async sendEmailCode(email) {
      const me = await current();
      if (me?.guest) {
        const { error } = await client.auth.updateUser({ email });
        if (!error) return { status: 'code-sent', mode: 'link' };
        if (error.code !== 'email_exists') return { status: 'error', message: authMessage(error) };
      }
      const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
      return error ? { status: 'error', message: authMessage(error) } : { status: 'code-sent', mode: 'signin' };
    },

    async verifyEmailCode(email, code, mode) {
      const before = (await current())?.userId ?? null;
      const { error } = await client.auth.verifyOtp({ email, token: code.trim(), type: mode === 'link' ? 'email_change' : 'email' });
      return error ? fail(error) : outcome(before);
    },
  };
}
