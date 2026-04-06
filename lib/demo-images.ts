/**
 * Deterministic placeholder photos for offline / mock UI (matches Laravel seed URLs).
 * Replace with your own CDN or remove after going live.
 */
export function demoPic(seed: string, width = 240, height = 360): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${width}/${height}`
}
