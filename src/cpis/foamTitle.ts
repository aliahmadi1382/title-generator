// Generated from Pejmana1978/cpis @ ce26ca5c3034d4d87ede710323f6409b8fe9456e.
// Source: modules/listings/core/foamPreparation.ts
// Do not edit here. Run npm run sync:cpis to refresh the reviewed source.

export const FOAM_OPTIONS = {
  row: { front: "Front", rear: "Rear" },
  side: { left: "Left", right: "Right" },
  part: { bottom: "Bottom", top: "Top / backrest" },
  ac: { "with-ac": "With A/C", "without-ac": "Without A/C" },
} as const;

export interface FoamTitleInput {
  row: "" | keyof typeof FOAM_OPTIONS.row;
  side: "" | keyof typeof FOAM_OPTIONS.side;
  part: "" | keyof typeof FOAM_OPTIONS.part;
  ac: "" | keyof typeof FOAM_OPTIONS.ac;
  color: string;
}

export function foamTitleFacts(pattern: { years: string; brand: string; model: string }, draft: FoamTitleInput) {
  const row = draft.row ? FOAM_OPTIONS.row[draft.row] : "";
  const side = draft.side ? FOAM_OPTIONS.side[draft.side] : "";
  const part = draft.part === "top" ? "Top" : draft.part === "bottom" ? "Bottom" : "";
  const ac = draft.ac ? FOAM_OPTIONS.ac[draft.ac] : "";
  const position = [row, side, part].filter(Boolean).join(" ");
  const completeIdentity = Boolean(row && side && part && ac);
  const title = completeIdentity ? `${pattern.years} Fits ${pattern.brand} ${pattern.model} ${position} Foam Cushion ${ac}`.replace(/\s+/g, " ").trim() : "";
  const identity = [position, "Foam Cushion", ac].filter(Boolean).join(" ");
  const seoTitle = [pattern.years, pattern.brand, pattern.model, identity].filter(Boolean).join(" ");
  const seoDescription = `${identity} for ${pattern.years} ${pattern.brand} ${pattern.model}.${draft.color.trim() ? ` Colour: ${draft.color.trim()}.` : ""}`;
  const keywords = [pattern.brand, pattern.model, pattern.years, position, "seat foam cushion", ac].filter(Boolean).join(", ");
  return { title, position, ac, completeIdentity, seoTitle, seoDescription, keywords };
}
