const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createTsLoader } = require('./load-ts.cjs');
const load = createTsLoader();
const { DEFAULT_ACCOUNTS: accounts } = load('src/config/accounts.ts');
const { MAIN_VARIATIONS: variations } = load('src/config/variations.ts');
const { buildAccountBlocks, matrixTitleRefs } = load('src/lib/matrix.ts');
const { processRawTitle } = load('src/lib/titlePipeline.ts');
const base = { yearRange: '2011-2014', make: 'Ford', model: 'F150', material: 'Vinyl', color: 'Tan',
  fitment: 'Fits', productType: 'Seat Cover', additionalVariation: '', notes: '', groupName: '' };

test('all account formats prefer Leatherette and preserve Covers and original material facts', () => {
  for (const material of ['Vinyl', 'Leatherette', 'Synthetic Leather']) {
    for (const ruleOptions of [{}, { competitorAccountIds: ['us-autonation', 'us-autoseatfactory', 'elite'], formats: { premium: 'multi', dsa: 'multi-bottoms' } }]) {
      const blocks = buildAccountBlocks({ ...base, material, ruleOptions }, variations, accounts);
      assert.equal(blocks.length, 8);
      for (const ref of matrixTitleRefs(blocks)) {
        assert.match(ref.title, /\bLeatherette\b/);
        assert.match(ref.title, /\bCovers?\b/);
        assert.doesNotMatch(ref.title, /Synthetic Leather|\bVinyl\b|Front Seats/);
        assert.ok(ref.title.length <= 80);
        assert.equal(ref.facts.material, material);
      }
    }
  }
});

test('full front titles reach Front Covers before dropping to Vinyl, and impossible drafts retain the product', () => {
  const premium = accounts.filter(account => account.id === 'premium');
  for (const formats of [{}, { premium: 'multi' }]) {
    for (const [length, material, valid] of [[36, 'Leatherette', true], [42, 'Vinyl', true], [70, 'Vinyl', false]]) {
      const row = buildAccountBlocks({ ...base, model: 'X'.repeat(length), ruleOptions: { formats } },
        variations.filter(item => item.id === 'm9'), premium)[0].titles[0];
      assert.match(row.title, /Front Covers/);
      assert.ok(row.title.includes(material));
      assert.ok(row.title.includes('X'.repeat(length)));
      assert.equal(row.valid, valid);
    }
  }
});

test('CSV title conversion follows the same material and cover wording', () => {
  for (const account of accounts) {
    const result = processRawTitle('2011-2014 Ford F150 Driver Bottom Vinyl Seat Cover Tan', account);
    assert.match(result.generated.title, /\bLeatherette\b/);
    assert.match(result.generated.title, /\bCover\b/);
    assert.doesNotMatch(result.generated.title, /Synthetic Leather/);
    assert.ok(result.generated.title.length <= 80);
  }
});
