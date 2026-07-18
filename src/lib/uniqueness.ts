// ---------------------------------------------------------------------------
// Cross-account title uniqueness.
//
// When several accounts generate a title for the SAME product/variation, the
// titles must be meaningfully different — not just different by capitalization,
// punctuation, spacing, "Fits" vs "For", connector style, or a minor approved
// abbreviation. This module provides:
//   - normalizeTitle(): collapse all of those cosmetic differences to a single
//     canonical form, so two titles that only differ cosmetically compare equal.
//   - titleSimilarity(): a 0..1 closeness score (normalized edit-distance ratio).
//   - compareTitles(): duplicate (identical after normalization) vs. too-similar
//     (>= threshold) verdict used by the Variation Matrix de-duplication pass.
//
// Lightweight and dependency-free (Levenshtein on the normalized strings).
// ---------------------------------------------------------------------------

/** Default "too similar" threshold (0..1). 0.85 = 85% or higher similarity. */
export const SIMILARITY_THRESHOLD = 0.85;

/**
 * Reduce a title to a canonical comparison form. Removes the differences the
 * spec calls "not meaningful": case, extra spaces, punctuation, "Fits"/"For",
 * connector style (`&`, `/`, `and`), and the approved abbreviation pairs
 * (Leather/Lthr., Replacement/Repl., Perforated/Perf., Bottom/Lower, Medium/Med,
 * Dark/Dk, Light/Lt, …) — each collapsed to one canonical long form.
 */
export function normalizeTitle(raw: string): string {
  let s = ` ${(raw || "").toLowerCase()} `;

  // Fitment word carries no product meaning for comparison ("Fits" == "For").
  s = s.replace(/\b(?:fits|for)\b/g, " ");

  // Connector style: "&", "/", and the word "and" are all equivalent.
  s = s.replace(/[/&]/g, " ").replace(/\band\b/g, " ");

  // Collapse approved abbreviation pairs to one canonical (long) form so a title
  // that was only shortened compares equal to its unshortened twin.
  s = s
    .replace(/\bgenuine\s+lthr\.?/g, "genuine leather")
    .replace(/\blthr\.?/g, "leather")
    .replace(/\brepl\.?/g, "replacement")
    .replace(/\b(?:perf|prf)\.?/g, "perforated")
    .replace(/\bcenter console\b/g, "console")
    .replace(/\blean back\b/g, "leanback")
    .replace(/\bback\b/g, "backrest")
    .replace(/\blower\b/g, "bottom")
    .replace(/\bsecond row\b/g, "2nd row")
    .replace(/\b2nd\b/g, "second")
    .replace(/\bmed\b/g, "medium")
    .replace(/\bdk\b/g, "dark")
    .replace(/\blt\b/g, "light");

  // Strip any remaining punctuation and collapse whitespace.
  s = s.replace(/[^a-z0-9]+/g, " ");
  return s.replace(/\s+/g, " ").trim();
}

/** Classic Levenshtein edit distance (iterative, single row buffer). */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + cost);
      diag = tmp;
    }
  }
  return prev[b.length];
}

/**
 * Similarity of two titles in 0..1 (1 = identical after normalization). Uses a
 * normalized edit-distance ratio on the canonical forms, so it is order-aware:
 * two titles built from the same words in a DIFFERENT account structure score
 * low (a real, meaningful difference), while titles that differ only by fitment
 * word / punctuation / a shortened year score very high.
 */
export function titleSimilarity(a: string, b: string): number {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (na === nb) return 1;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(na, nb) / maxLen;
}

/**
 * Compare two titles. `duplicate` = identical after normalization (only cosmetic
 * / abbreviation differences). `similar` = at or above the similarity threshold
 * (practically the same). A duplicate is always also similar.
 */
export function compareTitles(
  a: string,
  b: string,
  threshold: number = SIMILARITY_THRESHOLD,
): { duplicate: boolean; similar: boolean; score: number } {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (na === nb) return { duplicate: true, similar: true, score: 1 };
  const score = titleSimilarity(a, b);
  return { duplicate: false, similar: score >= threshold, score };
}

/** True when `candidate` duplicates or is too similar to any accepted title. */
export function clashesWithAny(
  candidate: string,
  accepted: string[],
  threshold: number = SIMILARITY_THRESHOLD,
): { clash: boolean; duplicate: boolean; against: string | null } {
  for (const a of accepted) {
    const r = compareTitles(a, candidate, threshold);
    if (r.duplicate || r.similar) return { clash: true, duplicate: r.duplicate, against: a };
  }
  return { clash: false, duplicate: false, against: null };
}
