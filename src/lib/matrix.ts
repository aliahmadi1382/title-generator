// ---------------------------------------------------------------------------
// Variation Matrix logic: turn one base listing into per-account titles for
// many variations, organized BY ACCOUNT, and build the matrix CSV export.
//
// A variation supplies the "seat component" wording, which is placed into the
// account's `position` slot — so the existing account-based generator and all
// title/abbreviation/shortening rules are reused unchanged.
// ---------------------------------------------------------------------------

import type {
  AccountBlock,
  AccountConfig,
  ListingInput,
  MatrixBaseInput,
  MatrixTitle,
  VariationConfig,
} from "../types";
import { generateForAccount, generateWithPhraseStages, getStatus } from "../titleGenerator";
import { toCsvText } from "./csv";

/** Map the matrix base inputs into a ListingInput (position filled per variation). */
function baseToListing(base: MatrixBaseInput): ListingInput {
  return {
    yearRange: base.yearRange,
    make: base.make,
    model: base.model,
    position: "", // set per variation
    material: base.material,
    variation: base.additionalVariation,
    color: base.color,
    fitment: base.fitment,
    productType: base.productType,
  };
}

/**
 * Generate one title for a (variation × account). For a variation that allows
 * the "Front Covers" label, if the full label can't fit 80 chars even after the
 * standard shortening pipeline, we try the short label as a last resort.
 */
export function generateVariationTitle(
  base: MatrixBaseInput,
  variation: VariationConfig,
  account: AccountConfig,
): MatrixTitle {
  const listing: ListingInput = { ...baseToListing(base), position: variation.label };

  // Main variations use the ordered phrase-stage fallback (most complete first).
  if (variation.phraseStages && variation.phraseStages.length > 0) {
    const g = generateWithPhraseStages(listing, account, variation.phraseStages);
    return {
      ...g,
      variationId: variation.id,
      variationName: variation.label,
      variationType: variation.type,
      editedTitle: g.title,
    };
  }

  // Custom variations use the SAME shortening pipeline as the main variations
  // (generateForAccount: abbreviations incl. slash, Fits→For, year shortening,
  // product fallback, Too Long/CHECK). We only relabel the generic abbreviation
  // note as a custom-variation note for clarity.
  let g = generateForAccount(listing, account);
  let notes = g.notes.replace("Shortened using approved abbreviations", "Custom variation shortened");
  if (!g.valid && variation.allowFrontCoversLabel && variation.shortLabel) {
    const alt = generateForAccount({ ...listing, position: variation.shortLabel }, account);
    if (alt.valid) {
      g = alt;
      notes = `Used "${variation.shortLabel}" to fit` + (alt.notes ? `; ${alt.notes}` : "");
    }
  }

  return {
    ...g,
    notes,
    variationId: variation.id,
    variationName: variation.label,
    variationType: variation.type,
    editedTitle: g.title,
  };
}

/**
 * Build one block per account, each containing one title per enabled variation.
 * Accounts are processed in the given order (already filtered to the selection).
 */
export function buildAccountBlocks(
  base: MatrixBaseInput,
  variations: VariationConfig[],
  accounts: AccountConfig[],
): AccountBlock[] {
  const enabledVariations = variations.filter((v) => v.enabled);
  return accounts.map((a) => ({
    accountId: a.id,
    accountName: a.name,
    accountStyleId: a.styleId,
    titles: enabledVariations.map((v) => generateVariationTitle(base, v, a)),
  }));
}

/** Status counts across blocks, based on the effective (edited) titles. */
export function countBlocks(blocks: AccountBlock[]): { valid: number; near: number; tooLong: number } {
  let valid = 0;
  let near = 0;
  let tooLong = 0;
  for (const b of blocks) {
    for (const t of b.titles) {
      const len = t.editedTitle.length;
      const st = getStatus(len);
      if (len <= 80) valid++;
      if (st === "Near Limit") near++;
      if (st === "Too Long") tooLong++;
    }
  }
  return { valid, near, tooLong };
}

// ---------------------------------------------------------------------------
// CSV export (account-first column order)
// ---------------------------------------------------------------------------

const MATRIX_HEADER = [
  "account_name",
  "variation_name",
  "year_range",
  "make",
  "model",
  "material",
  "color",
  "product_type",
  "generated_title",
  "selected_new_title",
  "title_length",
  "status",
  "risk_flag",
  "notes",
];

function matrixRow(base: MatrixBaseInput, t: MatrixTitle): (string | number)[] {
  const selected = t.editedTitle;
  const len = selected.length;
  const status = getStatus(len);
  const tooLong = len > 80;
  const edited = selected !== t.title;
  // Keep the generator's notes (which already include any fitment/year/product
  // fallback messages); append "Manually edited" when the user changed it.
  let notes = t.notes;
  if (tooLong) notes = notes ? `${notes}` : "Needs manual shortening";
  else if (edited) notes = notes ? `${notes}; Manually edited` : "Manually edited";

  return [
    t.accountName,
    t.variationName,
    base.yearRange,
    base.make,
    base.model,
    base.material,
    base.color,
    base.productType,
    t.title, // generated_title (original)
    selected, // selected_new_title (edited or same)
    len,
    status,
    tooLong ? "CHECK" : "OK",
    notes,
  ];
}

/** Export every account block × variation (one row per title). */
export function buildMatrixCsv(blocks: AccountBlock[], base: MatrixBaseInput): string {
  const rows: (string | number)[][] = [];
  for (const b of blocks) for (const t of b.titles) rows.push(matrixRow(base, t));
  return toCsvText(MATRIX_HEADER, rows);
}
