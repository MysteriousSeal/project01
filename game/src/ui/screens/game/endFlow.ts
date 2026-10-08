/** Seconds after death before the revive offer appears, and before the run ends without one. */
export const OFFER_DELAY = 0.6;
export const END_DELAY = 0.7;

type Phase = 'playing' | 'offer' | 'ending' | 'ended';

/** What happens after the ball dies: an optional revive offer, then the end of the run. */
export class EndFlow {
  private phase: Phase = 'playing';
  private deadFor = 0;

  /** Advances one frame. Returns the revive price when an offer opens, 'end' once, or null. */
  tick(dt: number, dead: boolean, priceFor: () => number | null): number | 'end' | null {
    if (!dead || this.phase === 'ended' || this.phase === 'offer') return null;
    this.deadFor += dt;
    if (this.phase === 'playing' && this.deadFor > OFFER_DELAY) {
      const price = priceFor();
      if (price !== null) {
        this.phase = 'offer';
        return price;
      }
      this.phase = 'ending';
    }
    if (this.phase === 'ending' && this.deadFor > END_DELAY) {
      this.phase = 'ended';
      return 'end';
    }
    return null;
  }

  resume() {
    this.phase = 'playing';
    this.deadFor = 0;
  }

  decline() {
    this.phase = 'ending';
    this.deadFor = END_DELAY;
  }

  get ended() {
    return this.phase === 'ended';
  }
}
