import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeSave, Save } from '../../game/meta/save';

export type CloudApi = {
  signIn: () => Promise<string | null>;
  pull: (userId: string) => Promise<Save | null>;
  push: (userId: string, save: Save) => Promise<boolean>;
};

export function supabaseCloud(client: SupabaseClient): CloudApi {
  return {
    async signIn() {
      const { data } = await client.auth.getSession();
      if (data.session) return data.session.user.id;
      const { data: anon, error } = await client.auth.signInAnonymously();
      return error ? null : (anon.user?.id ?? null);
    },
    async pull(userId) {
      const { data, error } = await client.from('saves').select('data, saved_at').eq('user_id', userId).maybeSingle();
      if (error || !data) return null;
      return normalizeSave({ ...data.data, savedAt: data.saved_at });
    },
    async push(userId, save) {
      const { error } = await client.from('saves').upsert({ user_id: userId, data: save, saved_at: save.savedAt }, { onConflict: 'user_id' });
      return !error;
    },
  };
}
