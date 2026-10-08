import { useEffect } from 'react';
import { AppState } from 'react-native';
import { telemetry } from '../instances';

export function useTelemetry(name: string) {
  useEffect(() => {
    const t = telemetry;
    if (!t) return;
    t.startSession();
    void t.flush();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        t.startSession();
        void t.flush();
      } else void t.endSession();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (telemetry && name) void telemetry.setName(name);
  }, [name]);
}
