export type OutboxTable = 'runs' | 'ledger' | 'sessions';

const TABLES: OutboxTable[] = ['runs', 'ledger', 'sessions'];
export type OutboxItem = { table: OutboxTable; row: Record<string, unknown> & { id: string } };
export type KeyValue = { get: () => Promise<string | null>; set: (value: string) => Promise<void> };
export type SendResult = 'ok' | 'retry' | 'reject';
export type Send = (table: OutboxTable, rows: OutboxItem['row'][]) => Promise<SendResult>;

export const OUTBOX_LIMIT = 500;
export const BATCH_SIZE = 50;

function parse(raw: string | null): OutboxItem[] {
  try {
    const items = raw ? JSON.parse(raw) : [];
    return Array.isArray(items) ? items.filter((i) => i && TABLES.includes(i.table) && typeof i.row?.id === 'string') : [];
  } catch {
    return [];
  }
}

export class Outbox {
  private items: OutboxItem[] = [];
  private ready: Promise<void>;
  private draining: Promise<void> | null = null;

  constructor(
    private store: KeyValue,
    private limit = OUTBOX_LIMIT,
  ) {
    this.ready = store
      .get()
      .then((raw) => {
        this.items = [...parse(raw), ...this.items];
      })
      .catch(() => {});
  }

  get size() {
    return this.items.length;
  }

  async add(item: OutboxItem) {
    await this.ready;
    this.items.push(item);
    if (this.items.length > this.limit) this.items.splice(0, this.items.length - this.limit);
    await this.persist();
  }

  async drain(send: Send) {
    if (this.draining) return this.draining;
    this.draining = this.drainAll(send).finally(() => {
      this.draining = null;
    });
    return this.draining;
  }

  private async drainAll(send: Send) {
    await this.ready;
    for (const table of TABLES) {
      for (;;) {
        const batch = this.items.filter((i) => i.table === table).slice(0, BATCH_SIZE);
        if (!batch.length) break;
        const result = await send(table, batch.map((i) => i.row)).catch((): SendResult => 'retry');
        if (result === 'retry') return;
        if (result === 'reject' && batch.length > 1) {
          if (!(await this.sendEach(table, batch, send))) return;
          continue;
        }
        const sent = new Set(batch);
        this.items = this.items.filter((i) => !sent.has(i));
        await this.persist();
      }
    }
  }

  private async sendEach(table: OutboxTable, batch: OutboxItem[], send: Send) {
    for (const item of batch) {
      const result = await send(table, [item.row]).catch((): SendResult => 'retry');
      if (result === 'retry') return false;
      this.items = this.items.filter((i) => i !== item);
      await this.persist();
    }
    return true;
  }

  private persist() {
    return this.store.set(JSON.stringify(this.items)).catch(() => {});
  }
}
