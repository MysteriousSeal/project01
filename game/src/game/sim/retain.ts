/** Filters an array in place, so per-frame cleanup allocates nothing. */
export function retain<T>(arr: T[], keep: (x: T) => boolean) {
  let n = 0;
  for (let i = 0; i < arr.length; i++) if (keep(arr[i])) arr[n++] = arr[i];
  arr.length = n;
}
