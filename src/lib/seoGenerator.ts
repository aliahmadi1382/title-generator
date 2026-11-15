import type { AccountConfig } from '../types';
import { generateSeo as cpisSeo, MOBILE_BY_NAME, MOBILE_FALLBACK, mobileDescription, type SeoInput } from '../cpis/seo';
import { parseForSeo } from './seoParser';
import { toCsvText } from './csv';
import { foamTitleFacts, type FoamTitleInput } from '../cpis/foamTitle';

export { MOBILE_BY_NAME, MOBILE_FALLBACK };
export { mobileDescription as generateMobileDescription };
export type SeoFacts = Omit<SeoInput, 'title'> & { foam?: FoamTitleInput };
export interface SeoResult {
  title: string;
  accountName: string;
  metaTags: string;
  metaDescription: string;
  mobileDescription: string;
}

export function defaultMobileTemplate(accountName: string): string {
  return MOBILE_BY_NAME[accountName] ?? MOBILE_FALLBACK;
}

/** Parsed facts are editable starting points for manual titles. Matrix results
 * supply their original facts instead of inferring them from shortened text. */
export function parseSeoFacts(title: string): SeoFacts {
  const parsed = parseForSeo(title);
  return { yearRange: parsed.yearRange, make: parsed.make, model: [parsed.model, parsed.chassis].filter(Boolean).join(' '),
    material: parsed.material, color: parsed.color, variation: '', variationId: '' };
}

export function generateSeo(title: string, account: AccountConfig | null, facts?: SeoFacts): SeoResult {
  const generated = cpisSeo({ ...(facts ?? parseSeoFacts(title)), title }, account);
  if (facts?.foam && facts.variationId === 'c4' && account?.id === 'premium') {
    const foam = foamTitleFacts({ years: facts.yearRange, brand: facts.make, model: facts.model }, facts.foam);
    return { title, accountName: account.name, metaTags: foam.keywords, metaDescription: foam.seoDescription, mobileDescription: generated.mobileDescription };
  }
  return { title, accountName: account?.name ?? '', metaTags: generated.metaKeywords,
    metaDescription: generated.metaDescription, mobileDescription: generated.mobileDescription };
}

export function buildSeoCsv(rows: SeoResult[]): string {
  return toCsvText(['title', 'account_name', 'meta_tags', 'meta_description', 'mobile_description'],
    rows.map(row => [row.title, row.accountName, row.metaTags, row.metaDescription, row.mobileDescription]));
}
