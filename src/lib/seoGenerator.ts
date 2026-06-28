// ---------------------------------------------------------------------------
// SEO content generator — builds Meta Tags, Meta Description, and an account-
// specific Mobile Description from a parsed title (SeoInfo).
// ---------------------------------------------------------------------------

import type { AccountConfig } from "../types";
import { parseForSeo, type SeoInfo } from "./seoParser";
import { toCsvText } from "./csv";

export interface SeoResult {
  title: string;
  accountName: string;
  metaTags: string;
  metaDescription: string;
  mobileDescription: string;
}

function dedupe(list: string[]): string[] {
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

// --- Meta Tags -------------------------------------------------------------

const META_TAG_CONSTANTS = [
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

function positionTags(d: SeoInfo["descr"]): string[] {
  const sides: string[] = [];
  if (d.driver) sides.push("driver");
  if (d.passenger) sides.push("passenger");
  if (!sides.length) sides.push("front");
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

export function generateMetaTags(info: SeoInfo): string {
  const mm = `${info.make} ${info.model}`.replace(/\s+/g, " ").trim();
  const tags: string[] = [];

  for (const y of info.years) tags.push(`${y} ${mm} seat cover`);

  if (info.color && info.material) tags.push(`${info.colorLower} ${info.materialLower} seat cover`);

  if (info.perforated && info.isLeather) tags.push("perforated leather car seat cover");
  else if (info.perforated) tags.push("perforated seat cover");

  // material-specific
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

// --- Meta Description ------------------------------------------------------

const META_DESC_CONSTANTS = [
  "OEM replacement seat cover",
  "Original seat cover",
  "Factory Match Upholstery",
  "Exact Fit Seat Cover",
  "Premium Auto Seat Cover",
  "Made in USA",
  "High-Quality Automotive Upholstery",
  "Car Seat Cover Replacement",
  "Factory Original Fit",
  "Direct Replacement Seat Cover",
  "OEM Spec Auto Upholstery",
  "Precut & Ready to Install Seat Cover",
  "Exact Color Match",
  "Vehicle-Specific Seat Cover",
  "Handcrafted in the USA",
  "Auto Interior Restoration",
  "High-Quality Seat Replacement",
  "Durable Automotive Upholstery",
  "Compatible with Heated Seats",
  "Compatible with Cooled Seats",
  "Compatible with Ventilated Seats",
];

export function generateMetaDescription(info: SeoInfo): string {
  const mm = `${info.make} ${info.model}`.replace(/\s+/g, " ").trim();
  const posL = info.positionLower.trim();

  // Primary, universal sentence-based Meta Description (vehicle includes chassis).
  const vehicle = [info.make, info.model, info.chassis].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  const yr = info.yearRange || info.years.join(", ");
  const universal = `Restore your ${yr} ${vehicle} interior with premium US-made OEM replacement seat covers. Factory-match color, material, and perfect fit.`
    .replace(/\s+/g, " ")
    .trim();

  const out: string[] = [];

  // Year-by-year make/model, then year-by-year chassis.
  for (const y of info.years) out.push(`${y} ${mm} seat cover`);
  if (info.chassis) for (const y of info.years) out.push(`${y} ${info.make} ${info.chassis} seat cover`);

  // Exact vehicle + position phrases.
  if (info.chassis) out.push(`${mm} ${info.chassis} ${posL} seat cover`.replace(/\s+/g, " ").trim());
  out.push(`${mm} ${posL} seat cover`.replace(/\s+/g, " ").trim());

  if (info.descr.bottom) {
    const s = info.descr.passenger && !info.descr.driver ? "passenger" : "driver";
    out.push(`${mm} ${s} seat cushion cover`.replace(/\s+/g, " ").trim());
    out.push(`${s} seat cushion cover`);
    if (info.chassis) out.push(`${info.chassis} ${s} lower seat cover`);
    out.push(`${s} seat cushion upholstery replacement`);
  }
  if (info.descr.top || info.descr.backrest) {
    const s = info.descr.passenger && !info.descr.driver ? "passenger" : "driver";
    out.push(`${s} seat back cover`);
  }

  // Material + color phrases.
  if (info.color && info.material) {
    out.push(`${info.colorLower} ${info.materialLower} seat cover`);
    if (info.perforated) out.push(`${info.colorLower} perforated ${info.materialLower} seat cover`);
  }
  if (info.isLeather) {
    out.push("genuine leather seat cover", "leather seat cover");
    if (info.perforated) out.push("perforated leather seat cover", "ventilated leather seat cover");
    out.push("premium leather replacement upholstery");
  }

  // Constants + conditional descriptors.
  out.push(...META_DESC_CONSTANTS);
  if (info.descr.driver) out.push("Driver Seat Cover");
  if (info.descr.passenger) out.push("Passenger Seat Cover");
  if (info.descr.front) out.push("Front Seat Cover");
  if (info.descr.rear) out.push("Rear Seat Cover");
  if (info.isLeather) out.push("Leather Seat Cover");

  // Make/chassis SEO tails.
  if (info.make) out.push(`${info.make} interior accessories`, `${info.make} interior restoration`);
  if (mm) out.push(`${mm} interior restoration`);
  if (info.chassis) out.push(`${info.chassis} upholstery replacement`, `${info.chassis} seat upholstery repair`);
  if (info.make) {
    out.push(`exact fit ${info.make} seat cover`, `OEM style ${info.make} seat cover`, `${info.make} seat repair cover`);
    if (info.descr.bottom) out.push(`${info.make} driver bottom seat cover`);
    out.push(`${info.make} seat cushion replacement`);
  }
  out.push("replacement automotive upholstery", "luxury car seat upholstery", "factory style leather upholstery");
  if (info.color) out.push(`${info.colorLower} interior seat replacement`);

  // Universal sentence is the primary output; supporting keyword phrases follow.
  const support = dedupe(out).join(", ");
  return support ? `${universal}\n\n${support}` : universal;
}

// --- Mobile Description (account-specific) ---------------------------------

export const MOBILE_FALLBACK =
  "Upgrade your vehicle interior with premium OEM-style replacement seat covers made with high-quality automotive materials. Enjoy factory-style fit, durable craftsmanship, fast shipping, 30-day returns, and a 1-year warranty. Tap to learn more.";

export const MOBILE_BY_NAME: Record<string, string> = {
  "U.S.AutoSeatCover":
    "WHY CHOOSE US AUTO SEAT COVER? 20+ years making factory-match OEM-replacement seat covers in our own Houston, TX factory. We use only top-quality automotive materials. 600,000+ happy customers. Free shipping, free 30-day returns, 1-year warranty. Click to see what makes us different.",
  DIY: "DIY Auto Upholstery has helped thousands of car owners upgrade their interiors with premium US-MADE OEM-style replacement seat covers. Expert craftsmanship and top-quality automotive materials, proudly made in our Houston, TX facility for over 20 years. Fast, free shipping, 30-day returns, and a 1-year warranty included. Tap to learn more.",
  "U.S.AutoSeatFactory":
    "Upgrade your ride with OEM-style seat covers made in our own Houston, TX facility. For over 20 years, US Auto Seat Factory has delivered precision-fit covers using top-grade automotive materials. Trusted by thousands of customers. Free shipping, easy 30-day returns, and a 1-year warranty. Tap now to explore our collection.",
  Master:
    "Discover premium, factory-style replacement seat covers crafted with expert precision in Houston, TX. With 20+ years of experience, Master Auto Upholstery delivers high-quality materials, perfect fits, and lasting durability. Enjoy free shipping, 30-day returns, and a 1-year warranty. Tap to see why drivers trust us.",
  Premium:
    "Experience top-tier craftsmanship with our OEM-style replacement seat covers—made in the USA using premium automotive materials. Over 20 years of expertise. Free shipping, 30-day returns, and a 1-year warranty included. Tap now to upgrade your interior with confidence.",
  "U.S.AutoNation":
    "Join 500k+ satisfied drivers who trust our handcrafted seat covers. Made in the USA with care and quality. Enjoy free shipping, 30-day returns, and a 1-year warranty. Tap now and see why customers choose us again and again.",
};

/** Resolve an account's mobile description (custom template → name map → fallback). */
export function generateMobileDescription(account: AccountConfig | null): string {
  if (account?.mobileDescription && account.mobileDescription.trim()) return account.mobileDescription.trim();
  if (account && MOBILE_BY_NAME[account.name]) return MOBILE_BY_NAME[account.name];
  return MOBILE_FALLBACK;
}

/** Effective mobile template for prefilling the Account Settings editor. */
export function defaultMobileTemplate(accountName: string): string {
  return MOBILE_BY_NAME[accountName] ?? MOBILE_FALLBACK;
}

// --- Combined ---------------------------------------------------------------

export function generateSeo(title: string, account: AccountConfig | null): SeoResult {
  const info = parseForSeo(title);
  return {
    title,
    accountName: account?.name ?? "",
    metaTags: generateMetaTags(info),
    metaDescription: generateMetaDescription(info),
    mobileDescription: generateMobileDescription(account),
  };
}

// --- CSV --------------------------------------------------------------------

export function buildSeoCsv(rows: SeoResult[]): string {
  const header = ["title", "account_name", "meta_tags", "meta_description", "mobile_description"];
  const out = rows.map((r) => [r.title, r.accountName, r.metaTags, r.metaDescription, r.mobileDescription]);
  return toCsvText(header, out);
}
