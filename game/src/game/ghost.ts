export type Track = [time: number, planet: number][];

export const TRACK_END = -1;
export const MAX_TRACK = 2000;

export const trackBest = (track: Track) => track.reduce((best, [, idx]) => Math.max(best, idx), 0);

export function parseTrack(raw: unknown): Track {
  if (!Array.isArray(raw)) return [];
  const out: Track = [];
  let lastT = 0;
  for (const e of raw) {
    if (!Array.isArray(e) || e.length !== 2) continue;
    const [t, idx] = e;
    if (typeof t !== 'number' || typeof idx !== 'number' || !Number.isFinite(t) || !Number.isInteger(idx)) continue;
    if (t < lastT || idx < TRACK_END) continue;
    out.push([t, idx]);
    lastT = t;
    if (out.length >= MAX_TRACK) break;
  }
  return out;
}
