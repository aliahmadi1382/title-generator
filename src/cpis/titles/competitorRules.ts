// Generated from Pejmana1978/cpis @ b5137d518f9134d410b5d13d244ce19b0bd420fc.
// Source: modules/listings/core/titles/competitorRules.ts
// Do not edit here. Run npm run sync:cpis to refresh the reviewed source.

// Opt-in Listing Engine formats, based on the eBay title research.
// Keep the original matrix as the baseline for every account that stays on Our rules.
import { getStatus, MAX_LENGTH, titleMaterialStages } from "./titleGenerator";
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
  "us-autonation": ["part", "material", "surface", "product", "color", "fitment", "year", "vehicle"],
  "us-autoseatfactory": ["fitment", "year", "vehicle", "material", "part", "product", "color", "surface"],
  elite: ["color", "material", "part", "surface", "product", "fitment", "year", "vehicle"],
};

interface Candidate { title: string; materialRank: number; phraseRank: number }

function candidates(base: MatrixBaseInput, variation: VariationConfig, account: CompetitorAccount, trim: string): Candidate[] {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const recordedTrim = trim.trim();
  const trimAlreadyNamed = ` ${normalize(base.model)} `.includes(` ${normalize(recordedTrim)} `);
  const vehicle = [base.make, base.model, trimAlreadyNamed ? "" : recordedTrim].filter(Boolean).join(" ");
  const yearOptions = [base.yearRange];
  const range = /^((?:19|20)\d{2})-((?:19|20)\d{2})$/.exec(base.yearRange);
  if (range) yearOptions.push(`${range[1]}-${range[2].slice(-2)}`, `${range[1].slice(-2)}-${range[2].slice(-2)}`);

  // Use explicitly recorded surface wording only. Leather, Vinyl and other
  // material identities stay intact; the absence of Perf does not mean Solid.
  const prefix = /^(Perforated|Perf\.?|Solid)\s+(.+)$/i.exec(base.material.trim());
  const suffix = /^(.+?)\s+(Perforated|Perf\.?|Solid)$/i.exec(base.material.trim());
  const material = prefix?.[2] ?? suffix?.[1] ?? base.material;
  const recordedSurface = prefix?.[1] || suffix?.[2] || "";
  const additional = base.additionalVariation.trim();
  const surfaceKey = (text: string) => normalize(text).replace(/^perforated$/, "perf");
  const surface = [recordedSurface, surfaceKey(additional) === surfaceKey(recordedSurface) ? "" : additional].filter(Boolean).join(" ");
  const surfaces = [...new Set([surface.replace(/\bPerf\.?(?=\s|$)/gi, "Perforated"), surface.replace(/\bPerforated\b/gi, "Perf")])];

  const plural = variation.type === "main" && !/^m[1-4]$/.test(variation.id);
  const seatCover = plural ? "Seat Covers" : "Seat Cover";
  const cover = plural ? "Covers" : "Cover";
  const products = [seatCover, `Replacement ${seatCover}`, cover];
  // Split the approved phrase into its existing part/product slots. The
  // account format stays exactly as researched; only those slots shorten.
  const phrases = variation.phraseStages?.length ? variation.phraseStages : products.map(product => `${variation.label} ${product}`);
  const placements = phrases.map(phrase => {
    const match = /^(.*?)\s+((?:Replacement (?:Seat )?|Seat )?Covers?)$/i.exec(phrase);
    if (!match) throw new Error(`Competitor cover phrase must retain Cover/Covers: ${phrase}`);
    return { part: match[1], product: match[2] };
  });
  const fitments = account === "us-autonation" ? ["For"] : ["For", "Fits"];
  const titles: Candidate[] = [];
  for (const [materialRank, wordsForMaterial] of titleMaterialStages(material).entries()) {
    for (const [phraseRank, placement] of placements.entries()) {
      const productsForPhrase = [...new Set([placement.product, placement.product.replace(/^Replacement /, "Repl. ")])];
      for (const year of yearOptions) for (const surface of surfaces) for (const product of productsForPhrase) for (const fitment of fitments) {
        const words: Record<string, string> = { year, fitment, vehicle, part: placement.part, material: wordsForMaterial, product, color: base.color, surface };
        titles.push({ title: FORMATS[account].map(key => words[key]).join(" ").replace(/\s+/g, " ").trim(), materialRank, phraseRank });
      }
    }
  }
  return titles;
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
      const ranked = options.filter(option => option.title.length <= MAX_LENGTH)
        .sort((a, b) => a.materialRank - b.materialRank || a.phraseRank - b.phraseRank || b.title.length - a.title.length);
      // Never switch to Vinyl or a shorter coverage phrase just for uniqueness
      // while a preferred material/phrase already fits the length limit.
      const fits = ranked.filter(option => option.materialRank === ranked[0].materialRank && option.phraseRank === ranked[0].phraseRank);
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
      const distinct = fits.find(option => unique(option.title));
      const chosen = distinct ?? fits[0] ?? options.reduce((a, b) => a.title.length <= b.title.length ? a : b);
      const title = chosen.title;
      const valid = title.length <= MAX_LENGTH;
      remember(row.variationId, title);
      return {
        ...row, title, editedTitle: title, characterCount: title.length, status: getStatus(title.length), valid,
        riskFlag: valid && distinct ? "OK" : "CHECK",
        notes: [!valid ? "Needs manual shortening" : distinct ? "" : "Manual review needed for cross-account similarity",
          chosen.materialRank > 0 ? "Leatherette changed to Vinyl after approved shortening" : "",
          chosen.phraseRank > 0 ? "Used approved variation phrase fallback in competitor order" : ""].filter(Boolean).join("; "),
      };
    }) };
  });
}
