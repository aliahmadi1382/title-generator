export * from './cpis/titles/types';
import type {
  MatrixBaseInput as CpisBase, MatrixTitle as CpisTitle, AccountBlock as CpisBlock,
  MatrixTitleRef as CpisTitleRef, HistoryRecord as CpisHistory,
} from './cpis/titles/types';
import type { PremiumListingFormat } from './cpis/templates/premiumListingFormat';
import type { SeoInput } from './cpis/seo';
import type { FoamTitleInput } from './cpis/foamTitle';

export type ListingFormat = PremiumListingFormat;
export interface TitleRuleOptions {
  competitorAccountIds?: string[];
  formats?: Record<string, ListingFormat>;
  trim?: string;
  preferFits?: boolean;
  foam?: FoamTitleInput;
}
export interface MatrixBaseInput extends CpisBase {
  ruleOptions?: TitleRuleOptions;
}
export interface MatrixTitle extends CpisTitle {
  sourceBase?: MatrixBaseInput;
  seoVariationId?: string;
  seoVariation?: string;
  ruleMode?: string;
}
export interface AccountBlock extends Omit<CpisBlock, 'titles'> {
  titles: MatrixTitle[];
}
export interface MatrixTitleRef extends CpisTitleRef {
  facts?: Omit<SeoInput, 'title'> & { foam?: FoamTitleInput };
}
export interface HistoryRecord extends Omit<CpisHistory, 'base' | 'mainBlocks' | 'customBlocks'> {
  base?: MatrixBaseInput;
  mainBlocks?: AccountBlock[];
  customBlocks?: AccountBlock[];
  rulesRevision?: string;
}
