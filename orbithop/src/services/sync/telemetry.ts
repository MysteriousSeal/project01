import type { LedgerEntry } from '../../game/meta/ledger';
import type { RunRow, SessionRow } from '../../game/meta/stats';
import { isPlausibleRun, uuid } from '../../game/meta/stats';
import { Outbox } from './outbox';
import type { StatsApi } from '../backend/statsApi';

export class Telemetry {
  private session: { id: string; started: number } | null = null;
  private pendingName: string | null = null;

  constructor(
    private api: StatsApi,
    private outbox: Outbox,
    private platform: string,
    private now: () => number = Date.now,
  ) {}

  startSession() {
    if (!this.session) this.session = { id: uuid(), started: this.now() };
  }

  async endSession() {
    const s = this.session;
    if (!s) return;
    this.session = null;
    const row: SessionRow = { id: s.id, started_at: new Date(s.started).toISOString(), ended_at: new Date(Math.max(this.now(), s.started)).toISOString(), platform: this.platform };
    await this.outbox.add({ table: 'sessions', row });
    await this.flush();
  }

  async logRun(row: RunRow) {
    if (!isPlausibleRun(row)) return;
    await this.outbox.add({ table: 'runs', row });
    await this.flush();
  }

  async logLedger(entries: LedgerEntry[]) {
    if (!entries.length) return;
    await this.outbox.add(...entries.map((row) => ({ table: 'ledger' as const, row })));
    await this.flush();
  }

  async setName(name: string) {
    this.pendingName = name;
    await this.flushName();
  }

  async flush() {
    await Promise.all([this.outbox.drain((table, rows) => this.api.insert(table, rows)), this.flushName()]);
  }

  private async flushName() {
    const name = this.pendingName;
    if (!name) return;
    const ok = await this.api.setName(name).catch(() => false);
    if (ok && this.pendingName === name) this.pendingName = null;
  }
}
