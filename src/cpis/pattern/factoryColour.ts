// Generated from Pejmana1978/cpis @ 0587b1246b5bf69c6caa9b379ca9f3738cf0b79b.
// Source: modules/pattern-library/core/factoryColour.ts
// Do not edit here. Run npm run sync:cpis to refresh the reviewed source.

/** Only an explicitly written single year or inclusive range; no annotations,
 * short years, lists, 'All years', or open-ended ranges are guessed. */
export function factoryYearScope(text: string): { from: number; to: number } | null {
  const match = /^(\d{4})(?:\s*-\s*(\d{4}))?$/.exec(text.trim().replace(/[‐-―−]/g, "-"));
  if (!match) return null;
  const from = Number(match[1]), to = Number(match[2] ?? match[1]);
  return from >= 1000 && to >= from ? { from, to } : null;
}
