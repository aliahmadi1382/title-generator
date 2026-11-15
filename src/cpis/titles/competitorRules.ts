// Generated from Pejmana1978/cpis @ ce26ca5c3034d4d87ede710323f6409b8fe9456e.
// Source: modules/listings/core/titles/competitorRules.ts
// Do not edit here. Run npm run sync:cpis to refresh the reviewed source.

// Opt-in Listing Engine formats, based on the eBay title research.
// Keep the original matrix as the baseline for every account that stays on Our rules.
import { getStatus, MAX_LENGTH } from "./titleGenerator";
import type { AccountBlock, MatrixBaseInput, VariationConfig } from "./types";
import { compareTitles, normalizeTitle } from "./uniqueness";

const COMPETITOR_ACCOUNTS = ["us-autonation", "us-autoseatfactory", "elite"] as const;
type CompetitorAccount = typeof COMPETITOR_ACCOUNTS[number];

export function supportsCompetitorTitles(id: string): id is CompetitorAccount {
  return COMPETITOR_ACCOUNTS.some(account => account === id);
}

export function competitorTitleAccounts(ids: readonly string[]): CompetitorAccount[] {
  return COMPETITOR_ACCOUNTS.filter(id => ids.includes(id));
}

const FORMATS: Record<CompetitorAccount, readonly string[]> = {
  "us-autonation": ["year", "fitment", "vehicle", "part", "material", "product", "color", "surface"],
  "us-autoseatfactory": ["fitment", "year", "vehicle", "material", "part", "product", "color", "surface"],
  elite: ["color", "material", "part", "surface", "product", "fitment", "year", "vehicle"],
};

// These alternatives describe the same components (front is both sides).
const FRONT_PAIR: Readonly<Record<string, string>> = {
  m7: "Front Top",
  m8: "Front Bottom",
  m9: "Front Top & Bottom",
};

function candidates(base: MatrixBaseInput, variation: VariationConfig, account: CompetitorAccount, trim: string): string[] {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const recordedTrim = trim.trim();
  const trimAlreadyNamed = ` ${normalize(base.model)} `.includes(` ${normalize(recordedTrim)} `);
  const vehicle = [base.make, base.model, trimAlreadyNamed ? "" : recordedTrim].filter(Boolean).join(" ");
  const yearOptions = [base.yearRange];
  const range = /^(19|20)(\d{2})-\1(\d{2})$/.exec(base.yearRange);
  if (range) yearOptions.push(`${range[1]}${range[2]}-${range[3]}`);

  // Use explicitly recorded surface wording only. Leather, Vinyl and other
  // material identities stay intact; the absence of Perf does not mean Solid.
  const prefix = /^(Perforated|Perf\.?|Solid)\s+(.+)$/i.exec(base.material.trim());
  const suffix = /^(.+?)\s+(Perforated|Perf\.?|Solid)$/i.exec(base.material.trim());
  const material = prefix?.[2] ?? suffix?.[1] ?? base.material;
  const surface = base.additionalVariation.trim() || prefix?.[1] || suffix?.[2] || "";
  const surfaces = /^(?:perforated|perf\.?)$/i.test(surface) ? ["Perforated", "Perf"] : [surface];

  const parts = [variation.label];
  if (variation.label.includes(" & ")) parts.push(variation.label.replaceAll(" & ", " and "));
  if (/^m[56]$/.test(variation.id)) parts.push(variation.label.replace("Top & Bottom", "Top/Bottom"));
  if (FRONT_PAIR[variation.id]) parts.push(FRONT_PAIR[variation.id]);
  if (/^(Driver|Passenger) (Top|Bottom)$/.test(variation.label)) {
    parts.push(`Front ${variation.label}`, variation.label.replace(" ", " Side "));
  }

  const plural = variation.type === "main" && !/^m[1-4]$/.test(variation.id);
  const seatCover = plural ? "Seat Covers" : "Seat Cover";
  const cover = plural ? "Covers" : "Cover";
  const products = [seatCover, `Replacement ${seatCover}`, `Repl. ${seatCover}`, cover];
  const fitments = account === "us-autonation" ? ["Fits", "For"] : ["For", "Fits"];
  const titles = new Set<string>();
  for (const year of yearOptions) for (const part of parts) for (const surface of surfaces) {
    for (const product of products) for (const fitment of fitments) {
      const words: Record<string, string> = { year, fitment, vehicle, part, material, product, color: base.color, surface };
      titles.add(FORMATS[account].map(key => words[key]).join(" ").replace(/\s+/g, " ").trim());
    }
  }
  return [...titles];
}

/** Replace only opted-in blocks. Existing titles keep their original order and
 * wording; uniqueness checks can only choose a different competitor candidate. */
export function applyCompetitorTitles(
  blocks: AccountBlock[],
  base: MatrixBaseInput,
  variations: readonly VariationConfig[],
  ids: readonly string[],
  trim = "",
): AccountBlock[] {
  if (ids.length === 0) return blocks;
  const selected = competitorTitleAccounts(ids);
  const keep = blocks.filter(block => !selected.some(id => id === block.accountId));
  const seen = new Map<string, Set<string>>();
  const remember = (id: string, title: string) => {
    const titles = seen.get(id) ?? new Set<string>();
    titles.add(title);
    seen.set(id, titles);
  };
  for (const block of keep) for (const row of block.titles) remember(row.variationId, row.title);
  const byId = new Map(variations.map(variation => [variation.id, variation]));

  return blocks.map(block => {
    const account = block.accountId;
    if (!supportsCompetitorTitles(account) || !ids.includes(account)) return block;
    return { ...block, titles: block.titles.map(row => {
      const variation = byId.get(row.variationId);
      if (!variation) return row;
      const options = candidates(base, variation, account, trim);
      const fits = options.filter(title => title.length <= MAX_LENGTH).sort((a, b) => b.length - a.length);
      const otherTitles = [...(seen.get(row.variationId) ?? [])];
      // A normalized candidate that conflicts once will also conflict in its
      // cosmetic variants, so avoid repeating comparisons while searching.
      const compared = new Map<string, boolean>();
      const unique = (title: string) => {
        const normalized = normalizeTitle(title);
        const cached = compared.get(normalized);
        if (cached !== undefined) return cached;
        const safe = otherTitles.every(other => {
          const result = compareTitles(other, title);
          return !result.duplicate && !result.similar;
        });
        compared.set(normalized, safe);
        return safe;
      };
      const distinct = fits.find(unique);
      const title = distinct ?? fits[0] ?? options.reduce((a, b) => a.length <= b.length ? a : b);
      const valid = title.length <= MAX_LENGTH;
      remember(row.variationId, title);
      return {
        ...row, title, editedTitle: title, characterCount: title.length, status: getStatus(title.length), valid,
        riskFlag: valid && distinct ? "OK" : "CHECK",
        notes: !valid ? "Needs manual shortening" : distinct ? "" : "Manual review needed for cross-account similarity",
      };
    }) };
  });
}
