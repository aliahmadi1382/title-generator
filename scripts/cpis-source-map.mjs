// The only CPIS files allowed into this offline application. No server,
// marketplace clients, credentials, customer records or production data.
const titles = 'modules/listings/core/titles/';
const entry = (source, target, extra = {}) => ({ source, target: `src/cpis/${target}`, ...extra });
export const sources = [
  ...['types', 'titleGenerator', 'accounts', 'variations', 'variationPhraseStages', 'uniqueness', 'matrix', 'csv', 'catalogLookup', 'catalogData', 'competitorRules']
    .map(name => entry(`${titles}${name}.ts`, `titles/${name}.ts`)),
  entry('modules/listings/core/productFactWording.ts', 'productFactWording.ts', {
    declarations: ['MATERIALS', 'listingMaterialWording', 'dsaColourLabel'], imports: [],
  }),
  entry(`${titles}premiumMulti.ts`, 'titles/premiumMulti.ts', {
    declarations: ['PREMIUM', 'PREMIUM_MULTI_TITLE_ID', 'PREMIUM_BOTTOMS_MULTI_TITLE_ID', 'premiumMultiTitle'],
    imports: ['./accounts', './titleGenerator', './types'],
  }),
  entry(`${titles}dsaMulti.ts`, 'titles/dsaMulti.ts', {
    declarations: ['DSA', 'TARGET_LENGTH', 'dsaMultiTitle'], imports: ['./accounts', './titleGenerator', './types'],
  }),
  entry('modules/listings/core/seo.ts', 'seo.ts', {
    replaceImports: { '../../pattern-library/core/colourYears': './pattern/colourYears' },
  }),
  entry('modules/pattern-library/core/colourYears.ts', 'pattern/colourYears.ts', {
    declarations: ['recordedYears', 'yearSpans', 'yearRangeText'], imports: ['./factoryColour'],
  }),
  entry('modules/pattern-library/core/factoryColour.ts', 'pattern/factoryColour.ts', {
    declarations: ['factoryYearScope'], imports: [],
  }),
  entry('modules/listings/core/templates/premiumListingFormat.ts', 'templates/premiumListingFormat.ts', {
    declarations: ['PremiumListingFormat', 'BOTTOMS', 'PREMIUM_FRONT_MULTI', 'PREMIUM_BOTTOMS_MULTI', 'premiumMultiRules', 'usesFrontMultiFormat'],
    imports: [], prepend: 'import type { MultiVariationRules } from "./types";\n',
  }),
  entry('modules/listings/core/templates/types.ts', 'templates/types.ts', {
    declarations: ['MultiVariationRules'], imports: [],
  }),
  entry('modules/listings/core/foamPreparation.ts', 'foamTitle.ts', {
    declarations: ['FOAM_OPTIONS'], imports: [],
    localFunction: {
      source: 'preparePremiumFoam',
      declarations: ['row', 'side', 'part', 'ac', 'position', 'completeIdentity', 'title', 'identity', 'seoTitle', 'seoDescription', 'keywords'],
      signature: 'export function foamTitleFacts(pattern: { years: string; brand: string; model: string }, draft: FoamTitleInput)',
      result: '{ title, position, ac, completeIdentity, seoTitle, seoDescription, keywords }',
    },
    append: '\nexport interface FoamTitleInput {\n  row: "" | keyof typeof FOAM_OPTIONS.row;\n  side: "" | keyof typeof FOAM_OPTIONS.side;\n  part: "" | keyof typeof FOAM_OPTIONS.part;\n  ac: "" | keyof typeof FOAM_OPTIONS.ac;\n  color: string;\n}\n',
  }),
];
