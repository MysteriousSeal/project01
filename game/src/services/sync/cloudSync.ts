import { resolveSave, SaveSource, touch } from '../../game/meta/sync';
import type { Save } from '../../game/meta/save';
import type { CloudApi } from '../backend/savesApi';

export const PUSH_DELAY_MS = 2500;

export type ChooseSave = (local: Save, remote: Save) => Promise<SaveSource>;

export class CloudSync {
  private userId: string | null = null;
  private pushedAt = 0;
  private latest: Save | null = null;
  private inFlight: Promise<void> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

  constructor(
    private api: CloudApi,
    private adopt: (save: Save) => void,
    private delayMs = PUSH_DELAY_MS,
  ) {}

  async start(local: Save, choose?: ChooseSave) {
    this.latest = this.latest ?? local;
    const userId = await this.api.signIn().catch(() => null);
    if (!userId || this.stopped) return;
    this.userId = userId;
    const remote = await this.api.pull(userId).catch(() => null);
    if (this.stopped) return;
    if (remote && choose) {
      const picked = await choose(this.latest, remote);
      if (this.stopped) return;
      if (picked === 'local') {
        const kept = touch(this.latest, Math.max(Date.now(), remote.savedAt + 1));
        this.latest = kept;
        this.pushedAt = remote.savedAt;
        this.adopt(kept);
        await this.flush();
        return;
      }
    }
    const { save, source } = remote && choose ? { save: remote, source: 'remote' as const } : resolveSave(this.latest, remote);
    if (source === 'remote') {
      this.pushedAt = save.savedAt;
      this.latest = save;
      this.adopt(save);
    } else {
      this.pushedAt = remote?.savedAt ?? 0;
      await this.flush();
    }
  }

  update(save: Save) {
    this.latest = save;
    if (!this.userId || save.savedAt <= this.pushedAt) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), this.delayMs);
  }

  async flush(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (this.inFlight) {
      await this.inFlight;
      return this.flush();
    }
    const save = this.latest;
    const userId = this.userId;
    if (!save || !userId || save.savedAt <= this.pushedAt || this.stopped) return;
    this.inFlight = this.api
      .push(userId, save)
      .catch(() => false)
      .then((ok) => {
        if (ok) this.pushedAt = Math.max(this.pushedAt, save.savedAt);
      })
      .finally(() => {
        this.inFlight = null;
      });
    await this.inFlight;
  }

  stop() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
  }

  get signedIn() {
    return this.userId !== null;
  }
}
