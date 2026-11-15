// Generated from Pejmana1978/cpis @ 39b132cf92d483cd1193fc1a2a1760ce702f063a.
// Source: modules/listings/core/titles/dsaMulti.ts
// Do not edit here. Run npm run sync:cpis to refresh the reviewed source.

import { DEFAULT_ACCOUNTS } from "./accounts";

import { evaluateTitle, generateWithPhraseStages, MAX_LENGTH } from "./titleGenerator";

import type { GeneratedTitle, MatrixBaseInput } from "./types";

const DSA = DEFAULT_ACCOUNTS.find(account => account.id === "dsa")!;

const TARGET_LENGTH = 75;

/** Keep DSA's title order. Fill short titles only with accurate coverage and
 * replacement wording that fits without shortening the vehicle or material. */
export function dsaMultiTitle(base: MatrixBaseInput, bottomsOnly: boolean): GeneratedTitle {
  const position = bottomsOnly ? "Front Bottom Seat Covers" : "Front Seat Covers";
  const generated = generateWithPhraseStages({ ...base, position, variation: base.additionalVariation },
    DSA, bottomsOnly ? [position, "Front Bottom Covers"] : [position]);
  if (generated.title.length >= TARGET_LENGTH || !generated.title.includes(position)) return generated;
  const phrases = bottomsOnly
    ? ["Front Driver and Passenger Bottom Seat Covers", "Front Driver & Passenger Bottom Seat Covers",
      "Front Bottom Replacement Seat Covers", "Front Bottom Seat Upholstery Covers"]
    : ["Front Driver and Passenger Replacement Seat Covers", "Front Driver and Passenger Seat Covers",
      "Front Driver & Passenger Seat Covers", "Front Replacement Seat Covers"];
  const title = phrases.map(phrase => generated.title.replace(position, phrase))
    .filter(candidate => candidate.length <= MAX_LENGTH && candidate.length > generated.title.length)
    .sort((a, b) => b.length - a.length)[0];
  return title ? { ...generated, ...evaluateTitle(title), title } : generated;
}
