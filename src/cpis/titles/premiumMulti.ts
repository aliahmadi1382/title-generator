// Generated from Pejmana1978/cpis @ b5137d518f9134d410b5d13d244ce19b0bd420fc.
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
    bottomsOnly ? [position, "Front Bottom Covers"] : [position, "Front Covers"]);
  return { ...generated, notes: generated.notes.replace("Used front-cover fallback", "Front seat-cover collection") };
}
