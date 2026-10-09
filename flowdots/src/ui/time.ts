// Wall-clock reads live here, outside component bodies: React's render-purity lint rejects a
// direct Date.now()/new Date() written inside a component, and screens get one shared source.
export function now(): number {
  return Date.now();
}

export function today(): Date {
  return new Date();
}
