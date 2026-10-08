import type { SupabaseClient } from '@supabase/supabase-js';
import type { Board, BoardEntry } from '../game/meta/stats';
import type { OutboxTable, SendResult } from './outbox';

export type StatsApi = {
  userId: () => Promise<string | null>;
  insert: (table: OutboxTable, rows: Record<string, unknown>[]) => Promise<SendResult>;
  leaderboard: (board: Board) => Promise<BoardEntry[] | null>;
  setName: (name: string) => Promise<boolean>;
};

const isDataError = (code: string | undefined) => !!code && (code.startsWith('22') || code.startsWith('23'));

type BoardRow = { rank: number; display_name: string; value: number; is_me: boolean };

export function supabaseStats(client: SupabaseClient): StatsApi {
  const userId = async () => (await client.auth.getSession()).data.session?.user.id ?? null;
  return {
    userId,
    async insert(table, rows) {
      const id = await userId();
      if (!id) return 'retry';
      const { error } = await client.from(table).upsert(rows.map((r) => ({ ...r, user_id: id })), { onConflict: 'id', ignoreDuplicates: true });
      if (!error) return 'ok';
      return isDataError(error.code) ? 'reject' : 'retry';
    },
    async leaderboard(board) {
      const { data, error } = await client.rpc('leaderboard', {
        board: board.kind,
        board_day: board.kind === 'daily' ? board.day : null,
        board_type: board.kind === 'daily' ? board.type : null,
        max_rows: 50,
      });
      if (error || !Array.isArray(data)) return null;
      return (data as BoardRow[]).map((r) => ({ rank: Number(r.rank), name: r.display_name, value: r.value, me: r.is_me }));
    },
    async setName(name) {
      const id = await userId();
      if (!id) return false;
      const { error } = await client.from('profiles').upsert({ user_id: id, display_name: name }, { onConflict: 'user_id' });
      return !error;
    },
  };
}
