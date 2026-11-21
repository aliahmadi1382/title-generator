// Generated from Pejmana1978/cpis @ b5137d518f9134d410b5d13d244ce19b0bd420fc.
// Source: modules/listings/core/templates/types.ts
// Do not edit here. Run npm run sync:cpis to refresh the reviewed source.

/**
 * A multi-variation account's variations, as its own export writes them.
 *
 * The variations are CPIS's own — the nine standard ones and the title
 * rules' armrests, by their ids (titles/variations.ts) — never a second list:
 * this only says which value eBay holds for each, and in what order the
 * store lists them.
 */
export interface MultiVariationRules {
  /** The one variation specific, as eBay names it ("Placement on Vehicle").
   *  It is never an item specific as well: eBay refuses a name in both. */
  readonly specificName: string;
  /** CPIS variation id → the value eBay holds for it, in the store's order. */
  readonly values: readonly (readonly [variationId: string, value: string])[];
  /** The variation whose listing values ARE the listing's — its title, its
   *  pictures, its description, its box: the whole front set, which every
   *  live listing of the account has. */
  readonly fullSet: string;
  /** An explicitly reviewed complete family; partial groups must not export. */
  readonly requireAll?: boolean;
}
