// ---------------------------------------------------------------------------
// Seat Cover Title Batch Generator — rule-based engine (no external APIs, no AI).
//
// Generates ONE eBay-style title per active account. Each account has its own
// title structure / fitment word / product wording, so titles look different
// while preserving identical product meaning. Titles are kept within the
// 80-character limit using only the approved abbreviation rules.
// ---------------------------------------------------------------------------

import type {
  AccountConfig,
  FitmentWord,
  GeneratedTitle,
  ListingInput,
  RiskFlag,
  Status,
  TitleToken,
} from "./types";

export const MAX_LENGTH = 80;

/** Required listing fields (Fitment/Product Type have defaults; Variation is optional). */
export const REQUIRED_LISTING_FIELDS: { key: keyof ListingInput; label: string }[] = [
  { key: "yearRange", label: "Year Range" },
  { key: "make", label: "Make" },
  { key: "model", label: "Model" },
  { key: "position", label: "Seat Position" },
  { key: "material", label: "Material" },
  { key: "color", label: "Color" },
];

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export function getStatus(length: number): Status {
  if (length > MAX_LENGTH) return "Too Long";
  if (length >= 76) return "Near Limit";
  if (length >= 71) return "Safe";
  return "Good";
}

// ---------------------------------------------------------------------------
// String building
// ---------------------------------------------------------------------------

/** Join title parts with single spaces, dropping empties and collapsing gaps. */
function build(parts: string[]): string {
  return parts
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Abbreviation rules
//
// PROTECTED — never produced (simply never listed as a replacement):
//   Genuine -> Gen.            (forbidden)
//   Driver  -> Drvr            (forbidden)
//   Passenger -> Pass/Pass./Psgr (forbidden)
//   Bottom  -> Btm             (forbidden)
//   Leatherette/Vinyl/Cloth/Suede/MB-Tex are never turned into "Leather".
//
// Abbreviations are applied ONLY when a title is over the limit, progressively
// (least-disruptive first), so meaning is preserved as long as possible. In
// particular "Genuine Leather" stays "Genuine Leather" unless shortening is
// actually required, in which case it becomes "Genuine Lthr." (never "Gen.").
//
// Word-boundary note: /\bLeather\b/ does NOT match "Leatherette" (the following
// "e" is a word char, so there is no boundary), so Leatherette is left intact.
// ---------------------------------------------------------------------------

interface Rule {
  re: RegExp;
  to: string;
  /** Optional human-readable note recorded when this rule actually fires. */
  note?: string;
}

// Color modifier abbreviations — shared by both the full and phrase-mode sets,
// so every section abbreviates colors the same way (only fire when over limit).
const COLOR_MODIFIER_RULES: Rule[] = [
  { re: /\bMedium\b/gi, to: "Med" },
  { re: /\bCharcoal\b/gi, to: "Char" },
  { re: /\bMetallic\b/gi, to: "Met" },
  { re: /\bNatural\b/gi, to: "Nat" },
  { re: /\bClassic\b/gi, to: "Clsc" },
  { re: /\bNeutral\b/gi, to: "Neut" },
  { re: /\bGlossy\b/gi, to: "Glsy" },
  { re: /\bBright\b/gi, to: "Brt" },
  { re: /\bMatte\b/gi, to: "Mt" },
  { re: /\bDark\b/gi, to: "Dk" },
  { re: /\bLight\b/gi, to: "Lt" },
  { re: /\bDeep\b/gi, to: "Dp" },
  { re: /\bPale\b/gi, to: "Pl" },
  { re: /\bSoft\b/gi, to: "Sft" },
  { re: /\bWarm\b/gi, to: "Wrm" },
  { re: /\bCool\b/gi, to: "Cl" },
];

const ABBREVIATIONS: Rule[] = [
  // Cosmetic / safe joiners first. "and" is case-insensitive so it also covers
  // "Top and Bottom" -> "Top & Bottom" and "Driver and Passenger" -> "Driver &
  // Passenger" (\band\b never matches inside words like "Grand" or "Brandon").
  { re: /\bWithout\b/g, to: "w/o" },
  { re: /\bWith\b/g, to: "w/" },
  { re: /\band\b/gi, to: "&" },
  { re: /\bPerforated\b/g, to: "Perf." },
  { re: /\bLean Back\b/g, to: "Leanback" },
  { re: /\bBackrest\b/g, to: "Back" },
  // "Only if necessary" abbreviations, applied later (meaning kept clear).
  { re: /\bSecond Row\b/gi, to: "2nd Row" },
  { re: /\bCenter Console\b/gi, to: "Console" },
  // Slash shortening — keeps the full words Driver / Passenger / Top / Bottom
  // (applied after "and -> &", so it converts the "&" form to the slash form).
  { re: /Driver & Passenger/g, to: "Driver/Passenger", note: "Used slash format" },
  { re: /Top & Bottom/g, to: "Top/Bottom", note: "Used slash format" },
  { re: /\bReplacement\b/g, to: "Repl." },
  { re: /\bGenuine Leather\b/g, to: "Genuine Lthr." },
  { re: /\bLeather\b/g, to: "Lthr." },
  // Color modifier abbreviations (only fire when still over the limit).
  ...COLOR_MODIFIER_RULES,
  { re: /\bBottom\b/g, to: "Lower", note: "Bottom changed to Lower" },
];

// Phrase-stage mode: the variation phrase itself encodes the seat component +
// product wording AND its reductions (and -> & -> / forms, Replacement/Seat/
// Cover steps, Side/Front fallbacks). So in phrase mode we DON'T abbreviate
// those phrase words — only material/variation words — letting the explicit,
// clean phrase progression do the component/product reducing.
const PHRASE_ABBREVIATIONS: Rule[] = [
  { re: /\bWithout\b/g, to: "w/o" },
  { re: /\bWith\b/g, to: "w/" },
  { re: /\bPerforated\b/g, to: "Perf." },
  { re: /\bGenuine Leather\b/g, to: "Genuine Lthr." },
  { re: /\bLeather\b/g, to: "Lthr." },
  // Color modifiers are shared (they affect the color token, not the phrase).
  ...COLOR_MODIFIER_RULES,
];

function applyRule(text: string, rule: Rule): string {
  return text.replace(rule.re, rule.to).replace(/\s+/g, " ").trim();
}

/**
 * Progressively shorten a title until it fits within MAX_LENGTH, applying the
 * approved abbreviations in priority order and stopping as soon as it fits.
 * Returns whether any abbreviation had to be applied.
 */
function fitToLimit(
  text: string,
  rules: Rule[] = ABBREVIATIONS,
): { title: string; abbreviated: boolean; notes: string[] } {
  let out = text;
  let abbreviated = false;
  const notes = new Set<string>();
  for (const rule of rules) {
    if (out.length <= MAX_LENGTH) break;
    const next = applyRule(out, rule);
    if (next !== out) {
      abbreviated = true;
      if (rule.note) notes.add(rule.note);
    }
    out = next;
  }
  return { title: out, abbreviated, notes: [...notes] };
}

// ---------------------------------------------------------------------------
// Token resolution
// ---------------------------------------------------------------------------

interface TitleValues {
  fit: FitmentWord;
  year: string;
  product: string;
}

/**
 * Resolve the title tokens for an account using the supplied dynamic values
 * (fitment word, year range, product wording). Everything else is the listing
 * value, preserved exactly. The variation token only renders when the account
 * opts in AND a variation value exists.
 */
function resolveTokens(listing: ListingInput, account: AccountConfig, v: TitleValues): string[] {
  return account.titleStructure.map((token: TitleToken) => {
    switch (token) {
      case "year":
        return v.year;
      case "fitment":
        return v.fit;
      case "make":
        return listing.make;
      case "model":
        return listing.model;
      case "position":
        return listing.position;
      case "material":
        return listing.material;
      case "variation":
        return account.usesVariation && listing.variation.trim().length > 0 ? listing.variation : "";
      case "productType":
        return v.product;
      case "color":
        return listing.color;
    }
  });
}

/**
 * Controlled year-range shortening. For a clean "YYYY-YYYY" range we expose two
 * stages: shorten only the ending year first ("2000-2010" -> "2000-10"), then
 * shorten both ("2000-2010" -> "00-10"). Non-standard formats are left intact.
 */
function yearStages(year: string): { end?: string; full?: string } {
  const m = year.trim().match(/^(\d{4})-(\d{4})$/);
  if (!m) return {};
  const start = m[1];
  const end = m[2];
  return { end: `${start}-${end.slice(2)}`, full: `${start.slice(2)}-${end.slice(2)}` };
}

// ---------------------------------------------------------------------------
// Generation
//
// Shortening priority when a title exceeds 80 chars (see project spec):
//   1-2. Approved abbreviations (incl. variation wording) — via fitToLimit.
//   3.   Dynamic fitment fallback: "Fits" -> "For" (shorter), only if needed.
//   4.   Shorten the year ENDING ("2000-2010" -> "2000-10").
//   5.   Shorten the year FULLY  ("2000-10"  -> "00-10").
//   6.   Shorter product wording -> "Cover" (meaning preserved), last resort.
//   7.   Still too long -> Too Long / CHECK / "Needs manual shortening".
// Protected words (Genuine/Driver/Passenger/Bottom) are never unsafely changed.
// ---------------------------------------------------------------------------

interface PipelineResult {
  title: string;
  fit: FitmentWord;
  year: string;
  abbreviated: boolean;
  fitmentChanged: boolean;
  yearChanged: boolean;
  productChanged: boolean;
  abbrevNotes: string[]; // specific notes from rules that fired (slash, Lower, …)
}

/**
 * Core shortening pipeline for ONE rendered title (a fixed position/product).
 * Applies, only as needed: approved abbreviations -> Fits→For -> year ending ->
 * year full -> (optional) generic product wording -> Cover. Fitment and year
 * changes are applied cumulatively (so earlier abbreviations are preserved).
 */
function runPipeline(
  listing: ListingInput,
  account: AccountConfig,
  baseFit: FitmentWord,
  baseProduct: string,
  productFallback: boolean,
  abbrevRules: Rule[] = ABBREVIATIONS,
): PipelineResult {
  const fullYear = listing.yearRange;
  const stages = yearStages(fullYear);

  let fit = baseFit;
  let year = fullYear;
  let product = baseProduct;

  // 1-2. Approved abbreviations.
  const noteSet = new Set<string>();
  const firstPass = fitToLimit(build(resolveTokens(listing, account, { fit, year, product })), abbrevRules);
  let title = firstPass.title;
  firstPass.notes.forEach((n) => noteSet.add(n));

  // 3. Dynamic fitment fallback — "For" is shorter than "Fits".
  let fitmentChanged = false;
  if (title.length > MAX_LENGTH && fit === "Fits") {
    title = title.replace(/\bFits\b/g, "For");
    fit = "For";
    fitmentChanged = true;
  }

  // 4-5. Shorten the year ending, then fully.
  if (title.length > MAX_LENGTH && stages.end) {
    title = title.replace(year, stages.end);
    year = stages.end;
  }
  if (title.length > MAX_LENGTH && stages.full) {
    title = title.replace(year, stages.full);
    year = stages.full;
  }

  // 6. Generic shorter product wording (only when phrase stages aren't driving it).
  let productChanged = false;
  if (productFallback && title.length > MAX_LENGTH && product !== "Cover") {
    const pf = fitToLimit(build(resolveTokens(listing, account, { fit, year, product: "Cover" })), abbrevRules);
    title = pf.title;
    pf.notes.forEach((n) => noteSet.add(n));
    product = "Cover";
    productChanged = true;
  }

  // Detect remaining abbreviations by comparing against the un-abbreviated build
  // with the final dynamic values (so only abbreviation differences show up).
  const fullNoAbbrev = build(resolveTokens(listing, account, { fit, year, product }));
  return {
    title,
    fit,
    year,
    abbreviated: title !== fullNoAbbrev,
    fitmentChanged,
    yearChanged: year !== fullYear,
    productChanged,
    abbrevNotes: [...noteSet],
  };
}

/** Generate the single title an account produces for a listing. */
export function generateForAccount(listing: ListingInput, account: AccountConfig): GeneratedTitle {
  const baseFit: FitmentWord = account.preferredFitmentWord || listing.fitment;
  const baseProduct: string = account.preferredProductWording || listing.productType;
  const r = runPipeline(listing, account, baseFit, baseProduct, true);

  const characterCount = r.title.length;
  const status = getStatus(characterCount);
  const valid = characterCount <= MAX_LENGTH;

  const notes: string[] = [];
  if (r.abbreviated) notes.push("Shortened using approved abbreviations");
  r.abbrevNotes.forEach((n) => notes.push(n)); // e.g. "Used slash format", "Bottom changed to Lower"
  if (r.fitmentChanged) notes.push("Fits changed to For");
  if (r.yearChanged) notes.push(`Year shortened to ${r.year}`);
  if (r.productChanged) notes.push("Product wording shortened to Cover");
  let riskFlag: RiskFlag = "OK";
  if (!valid) {
    riskFlag = "CHECK";
    notes.push("Needs manual shortening");
  }

  return {
    accountId: account.id,
    accountName: account.name,
    accountStyleId: account.styleId,
    title: r.title,
    characterCount,
    status,
    riskFlag,
    notes: notes.join("; "),
    valid,
  };
}

/**
 * Main-variation phrase fallback (Variation Matrix only). Tries an ordered list
 * of complete variation phrases (most complete first); each phrase is run
 * through the standard pipeline (abbreviations -> Fits→For -> year shortening).
 * The first phrase that yields a valid (<=80) title wins; otherwise the shortest
 * attempted phrase is returned and flagged Too Long / CHECK.
 *
 * The phrase carries its own product wording, so the account's product token is
 * suppressed (product = "") to avoid duplicate "...Seat Cover ... Cover".
 */
export function generateWithPhraseStages(
  listing: ListingInput,
  account: AccountConfig,
  phraseStages: string[],
): GeneratedTitle {
  const baseFit: FitmentWord = account.preferredFitmentWord || listing.fitment;

  let chosen: PipelineResult | null = null;
  let chosenPhrase = "";
  let chosenIndex = 0;

  for (let i = 0; i < phraseStages.length; i++) {
    const phrase = phraseStages[i];
    const r = runPipeline({ ...listing, position: phrase }, account, baseFit, "", false, PHRASE_ABBREVIATIONS);
    if (r.title.length <= MAX_LENGTH) {
      chosen = r;
      chosenPhrase = phrase;
      chosenIndex = i;
      break;
    }
    // Remember the last (shortest) attempt as the fallback if nothing fits.
    chosen = r;
    chosenPhrase = phrase;
    chosenIndex = i;
  }

  const r = chosen as PipelineResult;
  const characterCount = r.title.length;
  const status = getStatus(characterCount);
  const valid = characterCount <= MAX_LENGTH;

  const notes: string[] = [];
  if (r.abbreviated) notes.push("Shortened using approved abbreviations");
  if (chosenIndex > 0) notes.push(`Variation phrase shortened to "${chosenPhrase}"`);
  if (chosenPhrase.includes("/")) notes.push("Used slash format");
  if (/\bFront\b/.test(chosenPhrase)) notes.push("Used front fallback");
  else if (/\bSide\b/.test(chosenPhrase)) notes.push("Used side fallback");
  if (r.fitmentChanged) notes.push("Fits changed to For");
  if (r.yearChanged) notes.push(`Year shortened to ${r.year}`);
  let riskFlag: RiskFlag = "OK";
  if (!valid) {
    riskFlag = "CHECK";
    notes.push("Needs manual shortening");
  }

  return {
    accountId: account.id,
    accountName: account.name,
    accountStyleId: account.styleId,
    title: r.title,
    characterCount,
    status,
    riskFlag,
    notes: notes.join("; "),
    valid,
  };
}

/**
 * Generate one title per ACTIVE account. The generator simply loops over the
 * enabled accounts, so adding accounts later automatically adds title options
 * without touching this function.
 */
export function generateForAllAccounts(
  listing: ListingInput,
  accounts: AccountConfig[],
): GeneratedTitle[] {
  return accounts.filter((a) => a.enabled).map((a) => generateForAccount(listing, a));
}

/** Re-evaluate an edited/selected title's character count and status. */
export function evaluateTitle(title: string): { characterCount: number; status: Status; valid: boolean } {
  const characterCount = title.length;
  const status = getStatus(characterCount);
  return { characterCount, status, valid: characterCount <= MAX_LENGTH };
}
