import { useEffect, useEffectEvent, useSyncExternalStore } from 'react';
import { dayKey } from '../../game/meta/calendar';
import { challengeTypesFor } from '../../game/meta/challengeTypes';
import { allBoards, Board, BoardEntry, boardKey } from '../../game/meta/stats';
import { BoardStore } from '../sync/boardStore';
import { supabase } from '../backend/client';
import { statsApi } from './useTelemetry';

export const boardStore = statsApi ? new BoardStore(statsApi) : null;

export const todaysBoards = (now: Date = new Date()) => allBoards(dayKey(now), challengeTypesFor(now).map((t) => t.id));

const noop = () => () => {};

export function usePrefetchLeaderboards() {
  useEffect(() => {
    if (!supabase || !boardStore) return;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) setTimeout(() => void boardStore?.loadAll(todaysBoards()), 0);
    });
    return () => data.subscription.unsubscribe();
  }, []);
}

export function useLeaderboard(board: Board, nonce: number): BoardEntry[] | null | undefined {
  const key = boardKey(board);
  const rows = useSyncExternalStore(boardStore?.subscribe ?? noop, () => boardStore?.get(key));
  const load = useEffectEvent(() => boardStore?.load(board));
  useEffect(() => {
    void load();
  }, [key, nonce]);
  return rows;
}
