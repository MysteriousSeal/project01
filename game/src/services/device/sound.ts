import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { SoundName, SOURCES } from './soundMap';

export { soundForEvent } from './soundMap';
export type { SoundName } from './soundMap';

// Sounds that can overlap get a few players so a new one doesn't cut the last one off.
const VOICES: Partial<Record<SoundName, number>> = { coin: 3, land: 2, launch: 2 };

const VOLUME: Partial<Record<SoundName, number>> = { launch: 0.5, land: 0.7, coin: 0.6, zone: 0.6 };

let pools: Map<SoundName, { players: AudioPlayer[]; next: number }> | null = null;

function load() {
  if (pools) return pools;
  // Respect the iPhone silent switch and let music from other apps keep playing.
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
  pools = new Map();
  for (const name of Object.keys(SOURCES) as SoundName[]) {
    const players = Array.from({ length: VOICES[name] ?? 1 }, () => {
      const p = createAudioPlayer(SOURCES[name]);
      p.volume = VOLUME[name] ?? 1;
      return p;
    });
    pools.set(name, { players, next: 0 });
  }
  return pools;
}

export function playSound(name: SoundName) {
  try {
    const pool = load().get(name)!;
    const player = pool.players[pool.next];
    pool.next = (pool.next + 1) % pool.players.length;
    player.seekTo(0).catch(() => {});
    player.play();
  } catch {
    // Sound is a nice-to-have; never let it break the game.
  }
}

/** Loads the players ahead of the first run so the first sounds play on time. */
export const preloadSounds = () => {
  try {
    load();
  } catch {}
};
