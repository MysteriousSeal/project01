import { Board, BoardEntry, boardKey } from '../game/meta/stats';
import type { StatsApi } from './statsApi';

type Listener = () => void;

export class BoardStore {
  private entries = new Map<string, BoardEntry[] | null>();
  private inFlight = new Map<string, Promise<void>>();
  private listeners = new Set<Listener>();

  constructor(private api: Pick<StatsApi, 'leaderboard'>) {}

  get(key: string): BoardEntry[] | null | undefined {
    return this.entries.get(key);
  }

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  load(board: Board): Promise<void> {
    const key = boardKey(board);
    const running = this.inFlight.get(key);
    if (running) return running;
    const task = this.api
      .leaderboard(board)
      .catch(() => null)
      .then((rows) => {
        if (rows === null && this.entries.get(key)) return;
        this.entries.set(key, rows);
        this.listeners.forEach((l) => l());
      })
      .finally(() => {
        this.inFlight.delete(key);
      });
    this.inFlight.set(key, task);
    return task;
  }

  loadAll(boards: Board[]) {
    return Promise.all(boards.map((b) => this.load(b)));
  }
}
