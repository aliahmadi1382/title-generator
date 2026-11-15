const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createTsLoader } = require('./load-ts.cjs');
const load = createTsLoader();
const { DEFAULT_ACCOUNTS: accounts } = load('src/config/accounts.ts');
const { MAIN_VARIATIONS: main, CUSTOM_VARIATIONS: custom } = load('src/config/variations.ts');
const { buildAccountBlocks, buildMatrixCsv, matrixTitleRefs, editAccountTitle } = load('src/lib/matrix.ts');
const cpis = load('src/cpis/titles/matrix.ts');
const { generateSeo } = load('src/lib/seoGenerator.ts');
const { parseCsv } = load('src/lib/csv.ts');
const { processRawTitle } = load('src/lib/titlePipeline.ts');
const account = id => accounts.find(item => item.id === id);
const base = {
  yearRange: '2011-2014', make: 'Ford', model: 'F150', material: 'Genuine Leather Perf', color: 'Tan',
  fitment: 'Fits', productType: 'Seat Cover', additionalVariation: '', notes: '', groupName: '',
};
const resultWithoutFacts = row => {
  const result = { ...row };
  for (const key of ['sourceBase', 'seoVariationId', 'seoVariation', 'ruleMode']) delete result[key];
  return result;
};

test('every Regular account and main variation matches the reviewed CPIS engine', () => {
  for (const product of [base,
    { ...base, make: 'Mercedes-Benz', model: 'S-Class W222', material: 'Genuine Leather', color: 'Light Cashmere', yearRange: '2014-2020' },
    { ...base, material: 'Leatherette', additionalVariation: 'Perforated', color: 'Saddle Brown' },
    { ...base, material: 'Vinyl', color: 'Tan (Beige)' },
    { ...base, model: 'A very long recorded vehicle model which cannot fit without losing protected facts' },
  ]) {
    const expected = cpis.buildAccountBlocks(product, main, accounts);
    const actual = buildAccountBlocks(product, main, accounts);
    assert.deepEqual(actual.map(block => ({ ...block, titles: block.titles.map(resultWithoutFacts) })), expected);
  }
});

test('DSA uses Beige in both matrix and imported-title generation; other accounts retain Tan', () => {
  const rows = buildAccountBlocks(base, [main[2]], [account('dsa'), account('master')]);
  assert.match(rows[0].titles[0].title, /Beige/);
  assert.doesNotMatch(rows[0].titles[0].title, /\bTan\b/);
  assert.match(rows[1].titles[0].title, /Tan/);
  const imported = processRawTitle('2011-2014 Ford F150 Driver Bottom Leather Seat Cover Tan', account('dsa'));
  assert.match(imported.generated.title, /Beige/);
});

test('the CPIS competitor fixture preserves recorded trim, identity and each opted-in account order', () => {
  const product = { ...base, ruleOptions: { trim: 'Lariat', competitorAccountIds: ['us-autonation', 'us-autoseatfactory', 'elite'] } };
  const old = buildAccountBlocks(base, [main[2]], accounts);
  const next = buildAccountBlocks(product, [main[2]], accounts);
  const title = id => next.find(block => block.accountId === id).titles[0];
  assert.equal(title('us-autonation').title, 'Driver Bottom Genuine Leather Perf Seat Cover Tan For 2011-2014 Ford F150 Lariat');
  assert.match(title('us-autoseatfactory').title, /^(Fits|For) 2011-(2014|14) Ford F150 Lariat Genuine Leather .*Driver.*Bottom .+ Tan Perf/);
  assert.match(title('elite').title, /^Tan Genuine Leather .*Driver.*Bottom Perf.* (Fits|For) 2011-(2014|14) Ford F150 Lariat$/);
  for (const id of product.ruleOptions.competitorAccountIds) {
    assert.equal(title(id).characterCount, 80);
    assert.doesNotMatch(title(id).title, /XL|XLT|AB12/);
  }
  for (const block of next.filter(block => !product.ruleOptions.competitorAccountIds.includes(block.accountId))) {
    assert.deepEqual(block.titles.map(resultWithoutFacts), old.find(item => item.accountId === block.accountId).titles.map(resultWithoutFacts));
  }
});

test('competitor formats preserve coverage and never invent Perforated or Solid', () => {
  const blocks = buildAccountBlocks({ ...base, yearRange: '2000-2001', material: 'Synthetic Leather',
    ruleOptions: { competitorAccountIds: ['elite'] } }, [main[7]], [account('elite')]);
  const title = blocks[0].titles[0].title;
  assert.match(title, /^Tan Synthetic Leather (Driver (and|&) Passenger Bottoms|Front Bottom)/);
  assert.doesNotMatch(title, /Perf|Solid|Top/);
  assert.match(title, /2000-(2001|01) Ford F150$/);
});

test('Premium Multi uses the CPIS parent-title fixture and keeps Regular rows independent', () => {
  const product = { ...base, yearRange: '2018-2022', make: 'Land Rover', model: 'Range Rover', color: 'Vintage Tan',
    ruleOptions: { formats: { premium: 'multi' } } };
  const blocks = buildAccountBlocks(product, main, [account('premium'), account('master')]);
  assert.equal(blocks[0].titles.length, 9);
  for (const row of blocks[0].titles) assert.equal(row.title, '2018-2022 Fits Land Rover Range Rover Tan Genuine Leather Perf Front Seat Covers');
  assert.match(blocks[1].titles[0].title, /Driver/);
  assert.ok(blocks[0].titles.every(row => row.ruleMode === 'multi'));
  const edited = editAccountTitle(blocks, 'premium', 'm1', 'Reviewed parent title');
  assert.ok(edited[0].titles.every(row => row.editedTitle === 'Reviewed parent title'));
  assert.deepEqual(edited[1], blocks[1]);
  assert.ok(blocks[0].titles.every(row => row.editedTitle === row.title));
});

test('DSA and Premium Multi Bottoms use only the three bottom variations and one parent title', () => {
  for (const id of ['dsa', 'premium']) {
    const block = buildAccountBlocks({ ...base, ruleOptions: { formats: { [id]: 'multi-bottoms' } } }, main, [account(id)])[0];
    assert.deepEqual(block.titles.map(row => row.variationId).sort(), ['m3', 'm4', 'm8']);
    assert.equal(new Set(block.titles.map(row => row.title)).size, 1);
    assert.ok(block.titles.every(row => row.valid));
    assert.match(block.titles[0].title, /Bottom/);
    assert.doesNotMatch(block.titles[0].title, /\bTop\b/);
    if (id === 'dsa') assert.match(block.titles[0].title, /Beige/);
  }
});

test('console covers are Premium-only and use their product-specific title and SEO', () => {
  const blocks = buildAccountBlocks(base, [custom.find(item => item.id === 'c3')], accounts);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].accountId, 'premium');
  assert.match(blocks[0].titles[0].title, /Center Console Lid Cover/);
  const ref = matrixTitleRefs(blocks)[0];
  const seo = generateSeo(ref.title, account('premium'), ref.facts);
  assert.match(seo.metaDescription, /lid not included/);
  assert.doesNotMatch(JSON.stringify(seo), /airbag|heated|cooled|precut/i);
});

test('all 16 Premium foam combinations match the independent CPIS foam title contract', () => {
  const foam = custom.find(item => item.id === 'c4');
  for (const row of ['front', 'rear']) for (const side of ['left', 'right']) for (const part of ['top', 'bottom']) for (const ac of ['with-ac', 'without-ac']) {
    const draft = { row, side, part, ac, color: 'White' };
    const product = { ...base, yearRange: '2015-2022', model: 'Edge', material: '', color: '', ruleOptions: { foam: draft } };
    const blocks = buildAccountBlocks(product, [foam], accounts);
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].accountId, 'premium');
    const position = [row, side, part].map(value => value[0].toUpperCase() + value.slice(1)).join(' ');
    const air = ac === 'with-ac' ? 'With A/C' : 'Without A/C';
    assert.equal(blocks[0].titles[0].title, `2015-2022 Fits Ford Edge ${position} Foam Cushion ${air}`);
    const ref = matrixTitleRefs(blocks)[0];
    const seo = generateSeo(ref.title, account('premium'), ref.facts);
    assert.match(seo.metaDescription, new RegExp(`${position} Foam Cushion`));
    assert.match(seo.metaDescription, /White/);
    assert.doesNotMatch(ref.title, /Leather|Tan|Seat Cover/);
    const exported = parseCsv(buildMatrixCsv(blocks, product));
    assert.equal(exported[1][exported[0].indexOf('material')], 'Foam Cushion');
    assert.equal(exported[1][exported[0].indexOf('color')], 'White');
  }
});

test('foam requires explicit facts and never loses position or A/C to hide an overlong title', () => {
  const variation = custom.find(item => item.id === 'c4');
  assert.throws(() => buildAccountBlocks(base, [variation], [account('premium')]), /foam/);
  const blocks = buildAccountBlocks({ ...base, model: 'A very long model and chassis name to review',
    ruleOptions: { foam: { row: 'front', side: 'left', part: 'bottom', ac: 'without-ac', color: 'White' } } }, [variation], [account('premium')]);
  assert.match(blocks[0].titles[0].title, /Front Left Bottom Foam Cushion Without A\/C/);
  assert.equal(blocks[0].titles[0].riskFlag, 'CHECK');
});

test('SEO retains full structured years and gaps even when the edited title omits them', () => {
  const blocks = buildAccountBlocks({ ...base, yearRange: '2011-2012, 2014' }, [main[2]], [account('master')]);
  blocks[0].titles[0].editedTitle = 'Reviewed Ford F150 Driver Bottom Leather Seat Cover Tan';
  const ref = matrixTitleRefs(blocks)[0];
  const seo = generateSeo(ref.title, account('master'), ref.facts);
  for (const year of ['2011', '2012', '2014']) assert.match(seo.metaTags, new RegExp(`${year} Ford`));
  assert.doesNotMatch(seo.metaTags, /2013/);
  assert.match(seo.metaDescription, /2011-2012, 2014/);
  assert.match(seo.metaDescription, /Ford F150/);
  assert.equal(seo.title, blocks[0].titles[0].editedTitle);
});

test('DSA UK SEO and mobile copy use the latest account rules', () => {
  const result = generateSeo('Reviewed title', account('dsa'), { ...base, variationId: 'm3', variation: 'Driver Bottom', material: 'Vinyl Perf' });
  assert.match(result.metaDescription, /driver’s seat base cover/);
  assert.match(result.metaDescription, /perforated synthetic leather/);
  assert.match(result.mobileDescription, /3–4 working days/);
  assert.doesNotMatch(JSON.stringify(result), /cooled seats|precut|1-year warranty/);
});

test('SEO does not repeat contradictory installation claims for the corrected accounts', () => {
  for (const id of ['premium', 'us-autoseatcover', 'us-autoseatfactory']) {
    const result = generateSeo('Driver Bottom Seat Cover', account(id), { ...base, variationId: 'm3', variation: 'Driver Bottom' });
    assert.doesNotMatch(result.metaTags, /precut|cooled seats/);
  }
});

test('generating another product cannot overwrite the original CSV and SEO facts', () => {
  const first = buildAccountBlocks(base, [main[2]], [account('master')]);
  const other = { ...base, make: 'Toyota', model: 'Camry', color: 'Gray' };
  buildAccountBlocks(other, [main[2]], [account('master')]);
  assert.equal(matrixTitleRefs(first, other)[0].facts.model, 'F150');
  const csv = parseCsv(buildMatrixCsv(first, other));
  assert.equal(csv[1][csv[0].indexOf('model')], 'F150');
});

test('CSV conversion holds console and foam products for explicit fact review', () => {
  for (const raw of ['2015-2022 Ford Edge Front Left Bottom Foam Cushion With A/C', '2011-2014 Ford F150 Leather Center Console Lid Cover Tan']) {
    const result = processRawTitle(raw, account('premium'));
    assert.equal(result.generated.title, raw);
    assert.equal(result.generated.riskFlag, 'CHECK');
    assert.match(result.generated.notes, /product facts/);
  }
});
