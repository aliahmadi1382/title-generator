const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createTsLoader } = require('./load-ts.cjs');
const load = createTsLoader();
const { isTitleReady, titleCsvProblem } = load('src/lib/titleLimit.ts');
const { buildMatrixCsv, buildAccountBlocks } = load('src/lib/matrix.ts');
const { DEFAULT_ACCOUNTS } = load('src/config/accounts.ts');
const { MAIN_VARIATIONS } = load('src/config/variations.ts');
const { parseCsv } = load('src/lib/csv.ts');

test('final title boundary accepts 80, rejects 81 and blank titles', () => {
  assert.equal(isTitleReady('a'.repeat(80)), true);
  for (const title of ['', '   ', 'a'.repeat(81)]) assert.equal(isTitleReady(title), false);
});

test('all CSV delivery formats reject over-limit final edits, including restored rows', () => {
  for (const column of ['title', 'new_title', 'selected_new_title', 'generated_title', 'attempted_new_title']) {
    assert.equal(titleCsvProblem(`item_id,${column}\r\n1,${'x'.repeat(80)}\r\n`), null);
    assert.match(titleCsvProblem(`item_id,${column}\r\n1,${'x'.repeat(81)}\r\n`), /1–80/);
  }
  assert.equal(titleCsvProblem(`old_title,new_title\n${'x'.repeat(140)},Valid corrected title`), null);
  assert.equal(titleCsvProblem('title,meta_description\nValid title,"Long SEO, ' + 'x'.repeat(300) + '"'), null);
  assert.match(titleCsvProblem('\uFEFFtitle,new_title\nOriginal,   '), /1–80/);
});

test('an impossible draft is held; a valid manual edit exports without truncating or mislabelling its original', () => {
  const base = { yearRange: '2011-2014', make: 'Ford', model: 'Long model '.repeat(20), material: 'Genuine Leather', color: 'Tan',
    fitment: 'Fits', productType: 'Seat Cover', additionalVariation: '', notes: '', groupName: '' };
  const blocks = buildAccountBlocks(base, [MAIN_VARIATIONS[2]], [DEFAULT_ACCOUNTS[0]]);
  const original = blocks[0].titles[0].title;
  assert.ok(original.length > 80);
  assert.throws(() => buildMatrixCsv(blocks, base), /1–80/);
  blocks[0].titles[0].editedTitle = '2011-2014 Ford reviewed model Driver Bottom Genuine Leather Cover Tan';
  const csv = buildMatrixCsv(blocks, base);
  assert.equal(titleCsvProblem(csv), null);
  const [header, row] = parseCsv(csv);
  assert.equal(row[header.indexOf('generated_title')], '');
  assert.equal(row[header.indexOf('selected_new_title')], blocks[0].titles[0].editedTitle);
  assert.equal(blocks[0].titles[0].title, original);
});
