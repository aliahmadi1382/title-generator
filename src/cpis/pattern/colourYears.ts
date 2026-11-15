// Generated from Pejmana1978/cpis @ 39b132cf92d483cd1193fc1a2a1760ce702f063a.
// Source: modules/pattern-library/core/colourYears.ts
// Do not edit here. Run npm run sync:cpis to refresh the reviewed source.

import { factoryYearScope } from './factoryColour';

/** Explicit years only. Comma-separated ranges retain gaps in older notes. */
export function recordedYears(value: string): number[] | null {
  const parts = value.trim().replace(/\s+only$/i, "").split(",");
  const years = new Set<number>();
  for (const part of parts) {
    const scope = factoryYearScope(part);
    if (!scope || scope.to - scope.from > 40) return null;
    for (let year = scope.from; year <= scope.to; year++) years.add(year);
  }
  const result = [...years].sort((a, b) => a - b);
  return result.length <= 41 ? result : null;
}

export function yearSpans(years: readonly number[]): { from: number; to: number }[] {
  const spans: { from: number; to: number }[] = [];
  for (const year of years) {
    const last = spans.at(-1);
    if (last && year === last.to + 1) last.to = year;
    else spans.push({ from: year, to: year });
  }
  return spans;
}

export function yearRangeText(years: readonly number[]): string {
  return yearSpans(years).map(({ from, to }) => from === to ? String(from) : `${from}-${to}`).join(", ");
}
