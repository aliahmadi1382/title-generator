// Generated from Pejmana1978/cpis @ b5137d518f9134d410b5d13d244ce19b0bd420fc.
// Source: modules/listings/core/templates/premiumListingFormat.ts
// Do not edit here. Run npm run sync:cpis to refresh the reviewed source.

import type { MultiVariationRules } from "./types";
export type PremiumListingFormat = "regular" | "multi" | "multi-bottoms";

export function usesFrontMultiFormat(accountId: string): boolean {
  return accountId === "premium" || accountId === "dsa";
}

const BOTTOMS = [
  ["m3", "Driver Bottom"], ["m4", "Passenger Bottom"], ["m8", "Driver and Passenger Bottoms"],
] as const;

export const PREMIUM_FRONT_MULTI: MultiVariationRules = {
  specificName: "Placement on Vehicle",
  values: [
    ...BOTTOMS,
    ["m1", "Driver Top"], ["m2", "Passenger Top"], ["m7", "Driver and Passenger Tops"],
    ["m5", "Driver Top and Bottom"], ["m6", "Passenger Top and Bottom"],
    ["m9", "Driver and Passenger Top and Bottom"],
  ],
  fullSet: "m9",
  requireAll: true,
};

export const PREMIUM_BOTTOMS_MULTI: MultiVariationRules = {
  ...PREMIUM_FRONT_MULTI,
  values: BOTTOMS,
  fullSet: "m8",
};

export function premiumMultiRules(format: PremiumListingFormat): MultiVariationRules | undefined {
  if (format === "multi-bottoms") return PREMIUM_BOTTOMS_MULTI;
  if (format === "multi") return PREMIUM_FRONT_MULTI;
}
