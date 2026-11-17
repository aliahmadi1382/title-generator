// Generated from Pejmana1978/cpis @ 048dd91a331739d946d77873f78e6429b2a72d58.
// Source: modules/listings/core/productFactWording.ts
// Do not edit here. Run npm run sync:cpis to refresh the reviewed source.

// Shared buyer-facing facts. Stored material labels, titles, prices and colour
// identities are separate contracts and are never renamed by these helpers.
const MATERIALS: Readonly<Record<string, string>> = {
  "genuine leather": "Genuine Leather",
  "genuine leather perf": "Genuine Leather with Leather Perforated Inserts",
  "genuine leather perforated": "Genuine Leather with Leather Perforated Inserts",
  vinyl: "Synthetic Leather",
  "vinyl perf": "Synthetic Leather with Perforated Inserts",
  "vinyl perforated": "Synthetic Leather with Perforated Inserts",
  "leather with vinyl perf": "Leather with Perforated Synthetic Leather Inserts",
  cloth: "Cloth",
};

export function listingMaterialWording(material: string): string | undefined {
  return MATERIALS[material.trim().replace(/\.$/, "").replace(/\s+/g, " ").toLowerCase()];
}

/** DSA's buyer-facing wording only. Pattern names, IDs and recorded OEM names
 * by year keep their original spelling. */
export function dsaColourLabel(label: string): string {
  return label.replace(/\b(?:tan\s*(?:\(\s*beige\s*\)|[-–—/]\s*beige\b)|beige\s*(?:\(\s*tan\s*\)|[-–—/]\s*tan\b)|tan\b)/gi,
    matched => /^tan$/i.test(matched) ? "Beige" : "Beige (Tan)");
}
