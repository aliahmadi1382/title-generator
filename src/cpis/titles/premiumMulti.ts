// Generated from Pejmana1978/cpis @ 39b132cf92d483cd1193fc1a2a1760ce702f063a.
// Source: modules/listings/core/titles/premiumMulti.ts
// Do not edit here. Run npm run sync:cpis to refresh the reviewed source.

import { DEFAULT_ACCOUNTS } from "./accounts";

import { generateWithPhraseStages } from "./titleGenerator";

import type { GeneratedTitle, MatrixBaseInput } from "./types";

const PREMIUM = DEFAULT_ACCOUNTS.find(a => a.id === "premium")!;

export const PREMIUM_MULTI_TITLE_ID = "multi-front";

export const PREMIUM_BOTTOMS_MULTI_TITLE_ID = "multi-front-bottoms";

export function premiumMultiTitle(base: MatrixBaseInput, bottomsOnly = false): GeneratedTitle {
  const position = bottomsOnly ? "Front Bottom Seat Covers" : "Front Seat Covers";
  const generated = generateWithPhraseStages({ ...base, position, variation: base.additionalVariation }, PREMIUM,
    bottomsOnly ? [position, "Front Bottom Covers"] : [position]);
  return { ...generated, notes: generated.notes.replace("Used Front Seats fallback", "Front seat-cover collection") };
}
