import type { AccountBlock, AccountConfig, MatrixBaseInput, MatrixTitleRef, VariationConfig } from '../types';
import { buildAccountBlocks as buildCpisBlocks, buildMatrixCsv as cpisCsv } from '../cpis/titles/matrix';
import { applyCompetitorTitles, competitorTitleAccounts } from '../cpis/titles/competitorRules';
import { premiumMultiTitle } from '../cpis/titles/premiumMulti';
import { dsaMultiTitle } from '../cpis/titles/dsaMulti';
import { premiumMultiRules, usesFrontMultiFormat } from '../cpis/templates/premiumListingFormat';
import { parseCsv, toCsvText } from './csv';
import { foamTitleFacts, FOAM_OPTIONS } from '../cpis/foamTitle';
import { evaluateTitle } from '../titleGenerator';
import { isTitleReady, TITLE_LIMIT_MESSAGE } from './titleLimit';

export { generateVariationTitle, countBlocks } from '../cpis/titles/matrix';

/** One Multi collection has one independently edited parent title, as in CPIS. */
export function editAccountTitle(blocks: AccountBlock[], accountId: string, variationId: string, value: string): AccountBlock[] {
  return blocks.map(block => {
    if (block.accountId !== accountId) return block;
    const mode = block.titles.find(title => title.variationId === variationId)?.ruleMode;
    const shared = mode === 'multi' || mode === 'multi-bottoms';
    return { ...block, titles: block.titles.map(title =>
      (shared ? title.ruleMode === mode : title.variationId === variationId) ? { ...title, editedTitle: value } : title) };
  });
}

/** CPIS preparation order: regular matrix, opted-in competitor formats,
 * Premium console separately, then each selected Multi parent title. */
export function buildAccountBlocks(base: MatrixBaseInput, variations: VariationConfig[], accounts: AccountConfig[]): AccountBlock[] {
  const snapshot = JSON.parse(JSON.stringify(base)) as MatrixBaseInput;
  const selected = variations.filter(variation => variation.enabled);
  const standard = selected.filter(variation => variation.id !== 'c3' && variation.id !== 'c4');
  const competitors = competitorTitleAccounts(base.ruleOptions?.competitorAccountIds ?? []);
  const blocks = applyCompetitorTitles(buildCpisBlocks(base, standard, accounts), base, standard,
    competitors, base.ruleOptions?.trim ?? '');
  const consoleCover = selected.find(variation => variation.id === 'c3');
  const premium = accounts.find(account => account.id === 'premium');
  if (consoleCover && premium) {
    blocks.find(block => block.accountId === premium.id)!.titles.push(...buildCpisBlocks(base, [consoleCover], [premium])[0].titles);
  }
  const foam = selected.find(variation => variation.id === 'c4');
  if (foam && premium) {
    const draft = base.ruleOptions?.foam;
    if (!draft || !(['row', 'side', 'part', 'ac'] as const).every(key => Object.hasOwn(FOAM_OPTIONS[key], draft[key])) || !draft.color.trim()) {
      throw new Error('Complete the foam’s seat row, physical side, seat part, A/C configuration and own color.');
    }
    const facts = foamTitleFacts({ years: base.yearRange, brand: base.make, model: base.model }, draft);
    const status = evaluateTitle(facts.title);
    blocks.find(block => block.accountId === premium.id)!.titles.push({
      accountId: premium.id, accountName: premium.name, accountStyleId: premium.styleId,
      title: facts.title, editedTitle: facts.title, ...status,
      riskFlag: status.valid ? 'OK' : 'CHECK', notes: status.valid ? '' : 'Needs manual shortening; foam position and A/C preserved.',
      variationId: foam.id, variationName: foam.label, variationType: foam.type,
    });
  }
  return blocks.map(block => {
    const format = usesFrontMultiFormat(block.accountId) ? base.ruleOptions?.formats?.[block.accountId] ?? 'regular' : 'regular';
    const multi = premiumMultiRules(format);
    const multiIds = new Set(multi?.values.map(([id]) => id));
    const parent = multi ? (block.accountId === 'dsa' ? dsaMultiTitle(base, format === 'multi-bottoms') : premiumMultiTitle(base, format === 'multi-bottoms')) : null;
    return {
      ...block,
      titles: block.titles.filter(title => !multi || title.variationType !== 'main' || multiIds.has(title.variationId)).map(title => {
        const shared = parent && multiIds.has(title.variationId);
        return {
          ...title, ...(shared ? { ...parent, editedTitle: parent.title } : {}),
          sourceBase: title.variationId === 'c4' ? { ...snapshot, material: 'Foam Cushion', color: base.ruleOptions!.foam!.color } : snapshot,
          ruleMode: shared ? format : competitors.includes(block.accountId as typeof competitors[number]) ? 'competitor' : 'regular',
          seoVariationId: title.variationId,
          seoVariation: title.variationName,
        };
      }),
    };
  }).filter(block => block.titles.length > 0);
}

/** Retain each result's facts if another product is generated in this session. */
export function matrixTitleRefs(blocks: AccountBlock[], fallbackBase?: MatrixBaseInput): MatrixTitleRef[] {
  return blocks.flatMap(block => block.titles.map(title => {
    const base = title.sourceBase ?? fallbackBase;
    return {
      accountId: block.accountId, accountName: block.accountName, variationName: title.variationName,
      label: `${block.accountName} · ${title.variationName}`, title: title.editedTitle,
      ...(base ? { facts: {
        yearRange: base.yearRange, make: base.make, model: base.model, material: base.material,
        color: base.color, variationId: title.seoVariationId ?? title.variationId,
        variation: title.seoVariation ?? title.variationName,
        ...(title.variationId === 'c4' && base.ruleOptions?.foam ? { foam: base.ruleOptions.foam } : {}),
      } } : {}),
    };
  }));
}

export function buildMatrixCsv(blocks: AccountBlock[], base: MatrixBaseInput): string {
  if (blocks.some(block => block.titles.some(title => !isTitleReady(title.editedTitle)))) throw new Error(TITLE_LIMIT_MESSAGE);
  const header = parseCsv(cpisCsv([], base))[0];
  const rows = blocks.flatMap(block => block.titles.flatMap(title =>
    parseCsv(cpisCsv([{ ...block, titles: [{ ...title,
      title: isTitleReady(title.title) ? title.title : '',
      notes: isTitleReady(title.title) ? title.notes : `${title.notes}; Original over-limit draft withheld from CSV; retained in this session.`,
    }] }], title.sourceBase ?? base)).slice(1)));
  return toCsvText(header, rows);
}
