// Generated from Pejmana1978/cpis @ ce26ca5c3034d4d87ede710323f6409b8fe9456e.
// Source: modules/listings/core/seo.ts
// Do not edit here. Run npm run sync:cpis to refresh the reviewed source.

// PORTED from github.com/aliahmadi1382/title-generator (src/lib/seoGenerator.ts
// and src/lib/seoParser.ts), 2026-09-21. These are the OFFICIAL SEO rules, the
// same standing as the title rules in ./titles — owner, §9: "Do not invent SEO
// rules. Use the repository as the source of truth."
//
// Every phrase, every constant and every ordering below is the repository's,
// copied. Change the rules HERE from now on, with a test, and keep the two in
// step until the standalone app is retired.
//
// ONE DELIBERATE DIFFERENCE, and it is not a rule change.
//
// The standalone app only ever has a TITLE — a string somebody pasted — so it
// re-parses that string to recover the make, the model, the years, the material
// and the colour. CPIS already holds every one of those as data, from the
// Pattern Library and from the listing being built. Re-parsing them out of a
// title CPIS itself generated would be a lossy round trip that can only lose:
// an 80-character title is SHORTENED, and the repository's own note says so —
// "Always use the FULL normalized year range — never title-shortened years."
//
// So the facts come from the listing, and the rules are unchanged. The one
// thing still read off the title is the set of seat-position flags, because
// that is what the repository does and those flags decide which position
// phrases appear; it reads the same expanded text, with the same regexes.
//
// Pure: no framework, no database, no browser.
import type { AccountConfig } from "./titles/types";
import { listingMaterialWording } from "./productFactWording";
import { recordedYears, yearRangeText } from "./pattern/colourYears";

// ── what the rules need to know about one listing ────────────────────────────

/** The facts the SEO rules read. CPIS supplies them; nothing is parsed out of
 *  a title except the position flags below. */
export interface SeoInput {
  readonly variationId?: string;
  /** The FINAL title — what actually goes out, after any manual override. */
  readonly title: string;
  readonly make: string;
  readonly model: string;
  /** "1999-2003" as the Pattern Library records it. */
  readonly yearRange: string;
  readonly material: string;
  readonly color: string;
  /** The variation being listed, in the official wording ("Driver Top"). */
  readonly variation: string;
}

export interface SeoInfo {
  readonly title: string;
  readonly years: readonly string[];
  readonly make: string;
  readonly model: string;
  /** A chassis or series code (W222, GX470) when the model carries one. */
  readonly chassis: string;
  readonly material: string;
  readonly materialLower: string;
  readonly isLeather: boolean;
  readonly perforated: boolean;
  readonly color: string;
  readonly colorLower: string;
  readonly descr: {
    readonly driver: boolean;
    readonly passenger: boolean;
    readonly front: boolean;
    readonly rear: boolean;
    readonly top: boolean;
    readonly bottom: boolean;
    readonly side: boolean;
    readonly backrest: boolean;
  };
}

/** Expand SEO abbreviations to full words and strip decorative symbols.
 *  The repository's `expandAbbrev`, unchanged. */
export function expandAbbrev(text: string): string {
  return (text || "")
    .replace(/\bGenuine Lthr\.?\b/gi, "Genuine Leather")
    .replace(/\bLthr\.?\b/gi, "Leather")
    .replace(/\b(?:Prf|Perf)\.?(?=\s|$)/gi, "Perforated")
    .replace(/\bDk\b/gi, "Dark")
    .replace(/\bLt\b/gi, "Light")
    .replace(/\bMed\b/gi, "Medium")
    .replace(/\bChar\b/gi, "Charcoal")
    .replace(/\bDp\b/gi, "Deep")
    .replace(/\bPl\b/gi, "Pale")
    .replace(/\bSft\b/gi, "Soft")
    .replace(/\bWrm\b/gi, "Warm")
    .replace(/\bCl\b/gi, "Cool")
    .replace(/\bNat\b/gi, "Natural")
    .replace(/\bClsc\b/gi, "Classic")
    .replace(/\bNeut\b/gi, "Neutral")
    .replace(/\bMet\b/gi, "Metallic")
    .replace(/\bMt\b/gi, "Matte")
    .replace(/\bGlsy\b/gi, "Glossy")
    .replace(/\bBrt\b/gi, "Bright")
    .replace(/[+"'“”‘’]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** A year range expanded into individual years. The repository's `expandYears`,
 *  unchanged: it handles two- and four-digit forms and refuses anything longer
 *  than forty years, which is a typo rather than a vehicle. */
export function expandYears(yearRange: string): string[] {
  const explicit = recordedYears(yearRange);
  if (explicit) return explicit.map(String);
  const m = yearRange.trim().match(/^(\d{2,4})\s*-\s*(\d{2,4})$/);
  if (m) {
    let start = parseInt(m[1], 10);
    let end = parseInt(m[2], 10);
    if (m[1].length === 2) start += start < 50 ? 2000 : 1900;
    if (m[2].length === 2) {
      const base = Math.floor(start / 100) * 100;
      end = base + (end % 100);
      if (end < start) end += 100;
    }
    if (end >= start && end - start <= 40) {
      const out: string[] = [];
      for (let y = start; y <= end; y += 1) out.push(String(y));
      return out;
    }
  }
  const single = yearRange.match(/\b(?:19|20)\d{2}\b/);
  return single ? [single[0]] : [];
}

/** Find a chassis/series code (W222, R230, GX470) in the model. The
 *  repository's `detectChassis`, reading the model CPIS holds. */
function detectChassis(model: string): { chassis: string; cleanModel: string } {
  const words = model.split(" ").filter((w) => w !== "");
  for (let i = 0; i < words.length; i += 1) {
    if (/^[A-Z]{1,3}\d{2,4}$/.test(words[i])) {
      const chassis = words[i];
      const rest = [...words.slice(0, i), ...words.slice(i + 1)];
      return { chassis, cleanModel: rest.join(" ").trim() };
    }
  }
  return { chassis: "", cleanModel: model.trim() };
}

/** The facts, assembled. */
export function seoInfo(input: SeoInput): SeoInfo {
  const expandedTitle = expandAbbrev(input.title);
  const material = expandAbbrev(input.material);
  const { chassis, cleanModel } = detectChassis(input.model.trim());

  // The position flags, read the way the repository reads them: over the
  // expanded text, with these exact regexes. The variation is included because
  // CPIS knows it even when the title had to drop it to fit 80 characters.
  const lc = `${expandedTitle} ${expandAbbrev(input.variation)}`.toLowerCase();
  const has = (re: RegExp) => re.test(lc);

  return {
    title: input.title,
    years: expandYears(input.yearRange),
    make: input.make.trim(),
    model: cleanModel,
    chassis,
    material,
    materialLower: material.toLowerCase(),
    isLeather: /leather/i.test(material) && !/leatherette/i.test(material),
    perforated: /\bperforated\b/i.test(expandedTitle) || /perf/i.test(input.variation),
    color: input.color.trim(),
    colorLower: input.color.trim().toLowerCase(),
    descr: {
      driver: has(/\bdriver\b/),
      passenger: has(/\bpassenger\b/),
      front: has(/\bfront\b/),
      rear: has(/\brear\b/),
      top: has(/\btop\b/),
      bottom: has(/\b(?:bottom|lower)\b/),
      side: has(/\bside\b/),
      backrest: has(/\bbackrest\b/),
    },
  };
}

// ── Meta keywords ────────────────────────────────────────────────────────────

function dedupe(list: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of list) {
    const k = x.trim().toLowerCase();
    if (x.trim() && !seen.has(k)) {
      seen.add(k);
      out.push(x.trim());
    }
  }
  return out;
}

/** The repository's META_TAG_CONSTANTS, in its order. */
export const META_TAG_CONSTANTS: readonly string[] = [
  "premium auto seat cover",
  "OEM replacement seat cover",
  "factory match upholstery",
  "exact fit seat cover",
  "made in USA",
  "high-quality automotive upholstery",
  "car seat replacement cover",
  "factory original fit",
  "direct replacement seat cover",
  "OEM spec auto upholstery",
  "precut & ready to install seat cover",
  "exact color match seat cover",
  "vehicle-specific seat cover",
  "handcrafted in the USA",
  "auto interior restoration",
  "high-quality seat replacement",
  "durable automotive upholstery",
  "compatible with heated & cooled seats",
];

/** The repository's `positionTags`, unchanged. */
function positionTags(d: SeoInfo["descr"]): string[] {
  const sides: string[] = [];
  if (d.driver) sides.push("driver");
  if (d.passenger) sides.push("passenger");
  if (sides.length === 0) sides.push("front");
  const out: string[] = [];
  for (const s of sides) {
    if (d.front) out.push(`front ${s} top seat cover`);
    if (d.side) out.push(`${s} side seat cover`);
    out.push(`${s} seat back cover`);
    out.push(`${s} upper seat cover`);
    if (d.bottom) {
      out.push(`${s} bottom seat cover`);
      out.push(`${s} seat cushion cover`);
    }
    if (d.top) out.push(`${s} top seat cover`);
    out.push(`${s} seat cover`);
  }
  return out;
}

/** The repository's `generateMetaTags`, unchanged. One comma-separated list. */
export function metaKeywords(info: SeoInfo): string {
  const mm = `${info.make} ${info.model}`.replace(/\s+/g, " ").trim();
  const tags: string[] = [];

  for (const y of info.years) tags.push(`${y} ${mm} seat cover`);

  if (info.color && info.material) tags.push(`${info.colorLower} ${info.materialLower} seat cover`);

  if (info.perforated && info.isLeather) tags.push("perforated leather car seat cover");
  else if (info.perforated) tags.push("perforated seat cover");

  if (info.isLeather) tags.push(/genuine/i.test(info.material) ? "genuine leather seat cover" : "leather seat cover");
  else if (/leatherette/i.test(info.material)) tags.push("leatherette seat cover", "synthetic leather car seat cover");
  else if (/vinyl/i.test(info.material)) tags.push("vinyl seat cover");
  else if (/cloth/i.test(info.material)) tags.push("cloth seat cover");

  tags.push(...positionTags(info.descr));
  tags.push(...META_TAG_CONSTANTS);

  if (mm) tags.push(`${mm} interior accessories`);
  if (info.descr.driver && info.model) tags.push(`driver seat upholstery replacement ${info.model}`);
  if (info.isLeather && info.descr.driver) tags.push("leather driver seat back cover replacement");
  tags.push("precision fit OEM style seat cover");

  return dedupe(tags).join(", ");
}

// ── Meta description ─────────────────────────────────────────────────────────

/**
 * The repository's `generateMetaDescription`, unchanged.
 *
 * The vehicle is make + model + chassis. No colour word ever appears here — the
 * repository is explicit that colour belongs in the keywords only. The year
 * range is the FULL one, first to last, never the title's shortened form.
 */
export function metaDescription(info: SeoInfo): string {
  const vehicle = [info.make, info.model, info.chassis].filter((p) => p !== "").join(" ").replace(/\s+/g, " ").trim();
  const yr = yearRangeText(info.years.map(Number));
  return `Restore your ${yr} ${vehicle} interior with premium US-made OEM replacement seat covers. Factory-match color, material, and perfect fit.`
    .replace(/\s+/g, " ")
    .trim();
}

// ── Mobile description (per account) ─────────────────────────────────────────

/** The repository's MOBILE_FALLBACK, unchanged. */
export const MOBILE_FALLBACK =
  "Upgrade your vehicle interior with premium OEM-style replacement seat covers made with high-quality automotive materials. Enjoy factory-style fit, durable craftsmanship, fast shipping, 30-day returns, and a 1-year warranty. Tap to learn more.";

/** Mobile copy keyed by the account NAME, which
 *  is why ./titles/accounts.ts keeps those names verbatim. */
export const MOBILE_BY_NAME: Readonly<Record<string, string>> = {
  "U.S.AutoSeatCover":
    "WHY CHOOSE US AUTO SEAT COVER? 20+ years making factory-match OEM-replacement seat covers in our own Houston, TX factory. We use only top-quality automotive materials. 600,000+ happy customers. Free shipping, free 30-day returns, 1-year warranty. Click to see what makes us different.",
  DIY: "DIY Auto Upholstery has helped thousands of car owners upgrade their interiors with premium US-MADE OEM-style replacement seat covers. Expert craftsmanship and top-quality automotive materials, proudly made in our Houston, TX facility for over 20 years. Fast, free shipping, 30-day returns, and a 1-year warranty included. Tap to learn more.",
  "U.S.AutoSeatFactory":
    "Upgrade your ride with OEM-style seat covers made in our own Houston, TX facility. For over 20 years, US Auto Seat Factory has delivered precision-fit covers using top-grade automotive materials. Trusted by thousands of customers. Free shipping, easy 30-day returns, and a 1-year warranty. Tap now to explore our collection.",
  DSA: "Restore your interior with an OEM-style replacement seat cover from DSA Seat Factory. Made in the USA with automotive-grade materials for a factory-style fit. Production and dispatch typically take 3–4 working days. 30-day returns.",
  Master:
    "Discover premium, factory-style replacement seat covers crafted with expert precision in Houston, TX. With 20+ years of experience, Master Auto Upholstery delivers high-quality materials, perfect fits, and lasting durability. Enjoy free shipping, 30-day returns, and a 1-year warranty. Tap to see why drivers trust us.",
  Premium:
    "Experience top-tier craftsmanship with our OEM-style replacement seat covers—made in the USA using premium automotive materials. Over 20 years of expertise. Free shipping, 30-day returns, and a 1-year warranty included. Tap now to upgrade your interior with confidence.",
  "U.S.AutoNation":
    "Join 500k+ satisfied drivers who trust our handcrafted seat covers. Made in the USA with care and quality. Enjoy free shipping, 30-day returns, and a 1-year warranty. Tap now and see why customers choose us again and again.",
};

/** The repository's `generateMobileDescription`: the account's own template,
 *  then the name map, then the fallback. Never per product — this is the
 *  account speaking, not the listing. */
export function mobileDescription(account: AccountConfig | null): string {
  const own = (account?.mobileDescription ?? "").trim();
  if (own !== "") return own;
  if (account && MOBILE_BY_NAME[account.name]) return MOBILE_BY_NAME[account.name];
  return MOBILE_FALLBACK;
}

// ── all three ────────────────────────────────────────────────────────────────

/** The three SEO fields a listing carries. */
export interface GeneratedSeo {
  readonly metaKeywords: string;
  readonly metaDescription: string;
  readonly mobileDescription: string;
}

/** THE SEO field names, as the overrides and the CSV know them. */
export const SEO_FIELDS = ["META_KEYWORDS", "META_DESCRIPTION", "MOBILE_DESCRIPTION"] as const;
export type SeoField = (typeof SEO_FIELDS)[number];

/** What the CSV column for each one is called. */
export const SEO_CSV_COLUMN: Readonly<Record<SeoField, string>> = {
  META_KEYWORDS: "meta_keywords",
  META_DESCRIPTION: "meta_description",
  MOBILE_DESCRIPTION: "mobile_description",
};

const DSA_SEAT_COVERS: Readonly<Record<string, string>> = {
  m1: "driver’s seat back cover",
  m2: "passenger’s seat back cover",
  m3: "driver’s seat base cover",
  m4: "passenger’s seat base cover",
  m5: "driver’s seat back and base covers",
  m6: "passenger’s seat back and base covers",
  m7: "front seat back covers",
  m8: "front seat base covers",
  m9: "front seat covers",
};

function dsaSeo(input: SeoInput, account: AccountConfig): GeneratedSeo {
  const years = expandYears(input.yearRange);
  const yearRange = yearRangeText(years.map(Number)).replace(/(\d)-(\d)/g, "$1–$2");
  const vehicle = [input.make.trim(), input.model.trim()].filter(Boolean).join(" ");
  const fitment = [yearRange, vehicle].filter(Boolean).join(" ");
  const covers = DSA_SEAT_COVERS[input.variationId ?? ""] ?? "seat cover";
  const sharedMaterial = listingMaterialWording(input.material);
  const material = sharedMaterial === "Synthetic Leather with Perforated Inserts"
    ? "perforated synthetic leather"
    : (sharedMaterial ?? expandAbbrev(input.material)).toLowerCase();
  const colourMaterial = [input.color.trim(), material].filter(Boolean).join(" ");
  const item = `OEM-style replacement ${covers}${material ? ` in ${material}` : ""}`;
  return {
    metaDescription: fitment
      ? `Restore your ${fitment} with an ${item}. Made in the USA.`
      : `An ${item}. Made in the USA.`,
    metaKeywords: dedupe([
      ...(vehicle ? years.map(year => `${year} ${vehicle} seat cover`) : []),
      [vehicle, covers].filter(Boolean).join(" "),
      colourMaterial ? `${colourMaterial} seat cover` : "",
      "OEM-style replacement seat cover",
      "factory colour match",
      vehicle ? `${vehicle} seat upholstery` : "",
    ]).join(", "),
    mobileDescription: mobileDescription(account),
  };
}

export function generateSeo(input: SeoInput, account: AccountConfig | null): GeneratedSeo {
  if (account?.id === "dsa") return dsaSeo(input, account);
  if (account?.id === "premium" && (input.variationId === "c3" || input.variationId === "c4")) {
    const product = input.variationId === "c3" ? "center console lid cover" : "seat foam cushion";
    const facts = [input.yearRange, input.make, input.model, input.variationId === "c3" ? input.material : "", product, input.color].filter(Boolean).join(" ");
    const notice = input.variationId === "c3" ? "Replacement cover only; lid not included." : "Check the product's position and ventilation configuration before ordering.";
    return { metaKeywords: [facts, `${input.make} ${input.model} ${product}`, "Premium Auto Seat Covers"].join(", "),
      metaDescription: `${facts}. ${notice}`, mobileDescription: `${facts}. ${notice}` };
  }
  const info = seoInfo(input);
  return {
    // These accounts' own specifics require installation cuts; cooled-seat
    // support is product-specific. Do not repeat contradictory historical SEO.
    metaKeywords: account?.id === "us-autoseatcover" || account?.id === "premium" || account?.id === "us-autoseatfactory"
      ? metaKeywords(info).split(", ").filter((phrase) => !/precut|cooled seats/i.test(phrase)).join(", ")
      : metaKeywords(info),
    metaDescription: metaDescription(info),
    mobileDescription: mobileDescription(account),
  };
}
