import { Platform } from 'react-native';
import { supabaseAccount } from './backend/accountApi';
import { supabase } from './backend/client';
import { supabaseCloud } from './backend/savesApi';
import { supabaseStats } from './backend/statsApi';
import { keyValue } from './device/storage';
import { BoardStore } from './sync/boardStore';
import { Outbox } from './sync/outbox';
import { Telemetry } from './sync/telemetry';

/**
 * The app's backend services, created once. Every one is null when the app runs without a
 * Supabase project (no EXPO_PUBLIC_SUPABASE_* variables), so the game works fully offline.
 */
export const savesApi = supabase ? supabaseCloud(supabase) : null;
export const statsApi = supabase ? supabaseStats(supabase) : null;
export const accountApi = supabase ? supabaseAccount(supabase) : null;
export const telemetry = statsApi ? new Telemetry(statsApi, new Outbox(keyValue('orbit-hop-outbox-v1')), Platform.OS) : null;
export const boardStore = statsApi ? new BoardStore(statsApi) : null;
