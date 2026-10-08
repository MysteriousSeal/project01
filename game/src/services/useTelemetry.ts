import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { Outbox } from './outbox';
import { supabaseStats } from './statsApi';
import { keyValue } from './storage';
import { supabase } from './supabase';
import { Telemetry } from './telemetry';

export const statsApi = supabase ? supabaseStats(supabase) : null;
export const telemetry = statsApi ? new Telemetry(statsApi, new Outbox(keyValue('orbit-hop-outbox-v1')), Platform.OS) : null;

export function useTelemetry(name: string) {
  useEffect(() => {
    if (!telemetry) return;
    telemetry.startSession();
    void telemetry.flush();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        telemetry.startSession();
        void telemetry.flush();
      } else void telemetry.endSession();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (telemetry && name) void telemetry.setName(name);
  }, [name]);
}
