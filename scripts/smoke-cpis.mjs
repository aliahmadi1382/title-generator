import assert from 'node:assert/strict';

export async function exerciseCpis(page, downloadFile) {
  await page.getByRole('button', { name: 'Variation Matrix', exact: true }).click();
  for (const [placeholder, value] of [['2000-2010', '2011-2014'], ['Chevy', 'Ford'], ['Silverado 1500', 'F150'], ['Genuine Leather', 'Genuine Leather Perf'], ['Tan', 'Tan']]) {
    await page.getByPlaceholder(placeholder, { exact: true }).fill(value);
    await page.keyboard.press('Tab');
  }
  await page.getByRole('combobox', { name: 'U.S.AutoNation title rules', exact: true }).selectOption('competitor');
  await page.getByRole('textbox', { name: 'Recorded trim', exact: true }).fill('Lariat');
  await page.getByRole('combobox', { name: 'Premium listing format', exact: true }).selectOption('multi');
  await page.getByRole('combobox', { name: 'DSA listing format', exact: true }).selectOption('multi-bottoms');
  await page.getByRole('button', { name: 'Generate Selected Formats', exact: true }).click();
  await page.getByRole('button', { name: 'Expand All', exact: true }).click();
  const results = page.getByRole('region', { name: 'Main variation results', exact: true });
  const rows = name => results.locator('.vm-group').filter({ has: page.getByText(name, { exact: true }) }).locator('.vm-input');
  const premium = await rows('Premium').evaluateAll(elements => elements.map(element => element.value));
  const dsa = await rows('DSA').evaluateAll(elements => elements.map(element => element.value));
  assert.equal(premium.length, 9);
  assert.equal(new Set(premium).size, 1);
  assert.equal(dsa.length, 3);
  assert.equal(new Set(dsa).size, 1);
  assert.match(dsa[0], /Bottom/);
  assert.match(dsa[0], /Beige/);
  assert.match(await rows('U.S.AutoNation').first().inputValue(), /Lariat/);

  await rows('Premium').first().fill('Reviewed Ford F150 Front Seat Covers');
  await page.getByRole('button', { name: 'SEO', exact: true }).click();
  await page.getByRole('combobox', { name: 'Select account', exact: true }).selectOption('premium');
  await page.getByRole('radio', { name: /^From Variation Matrix/ }).check();
  await page.getByRole('button', { name: 'Generate SEO', exact: true }).click();
  assert.match(await page.getByRole('textbox', { name: 'Meta Description', exact: true }).inputValue(), /2011-2014/);
  assert.doesNotMatch(await page.getByRole('textbox', { name: 'Meta Tags', exact: true }).inputValue(), /precut|cooled seats/);

  await page.getByRole('button', { name: 'Variation Matrix', exact: true }).click();
  const customs = page.getByRole('region', { name: 'Custom variations', exact: true });
  await customs.getByRole('checkbox', { name: 'Center Console', exact: true }).check();
  await customs.getByRole('checkbox', { name: 'Foam Cushion', exact: true }).check();
  for (const [name, value] of [['Seat row', 'front'], ['Physical side', 'left'], ['Seat part', 'bottom'], ['A/C configuration', 'without-ac']]) {
    await page.getByRole('combobox', { name: `Foam ${name}`, exact: true }).selectOption(value);
  }
  await page.getByRole('textbox', { name: 'Foam color', exact: true }).fill('White');
  await page.getByRole('button', { name: 'Generate Custom Variation Titles', exact: true }).click();
  await customs.getByRole('button', { name: /^Premium / }).click();
  assert.equal(await customs.locator('.vm-group').count(), 1);
  assert.match(await customs.getByRole('textbox', { name: 'Center Console', exact: true }).inputValue(), /Center Console Lid Cover/);
  assert.equal(await customs.getByRole('textbox', { name: 'Foam Cushion', exact: true }).inputValue(), '2011-2014 Fits Ford F150 Front Left Bottom Foam Cushion Without A/C');
  await downloadFile(page.getByRole('button', { name: 'Export Custom Variation Titles', exact: true }));
  await page.getByRole('button', { name: 'Save to History', exact: true }).click();
  await page.getByRole('button', { name: /^History/ }).click();
  await page.getByRole('button', { name: 'Reopen', exact: true }).first().click();
  assert.equal(await page.getByRole('combobox', { name: 'DSA listing format', exact: true }).inputValue(), 'multi-bottoms');
  assert.equal(await page.getByRole('combobox', { name: 'U.S.AutoNation title rules', exact: true }).inputValue(), 'competitor');
  assert.equal(await page.getByRole('textbox', { name: 'Foam color', exact: true }).inputValue(), 'White');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/cpis-rules.png' });
  // An impossible title remains a review draft, with every delivery route held.
  await page.getByPlaceholder('Silverado 1500', { exact: true }).fill('Long recorded model and chassis '.repeat(5));
  await page.keyboard.press('Tab');
  await page.getByRole('button', { name: 'Generate Custom Variation Titles', exact: true }).click();
  await customs.getByRole('button', { name: /^Premium / }).click();
  const foam = customs.getByRole('textbox', { name: 'Foam Cushion', exact: true });
  assert.ok((await foam.inputValue()).length > 80);
  assert.match(await foam.inputValue(), /Without A\/C$/);
  assert.equal(await foam.getAttribute('maxlength'), '80');
  assert.equal(await customs.getByRole('button', { name: 'Copy title', exact: true }).first().isDisabled(), true);
  assert.equal(await customs.getByRole('button', { name: 'Copy all in account', exact: true }).isDisabled(), true);
  const exportCustom = page.getByRole('button', { name: 'Export Custom Variation Titles', exact: true });
  assert.equal(await exportCustom.isDisabled(), true);
  await foam.fill('2011-2014 Fits Ford F150 Front Left Bottom Foam Cushion Without A/C');
  await customs.getByRole('textbox', { name: 'Center Console', exact: true }).fill('2011-2014 Fits Ford F150 Leather Center Console Lid Cover Tan');
  assert.equal(await exportCustom.isEnabled(), true);
  await downloadFile(exportCustom);
  assert.equal(await page.getByRole('button', { name: 'Update', exact: true }).count(), 1);
  console.log('PASS: 80-character title gate blocks individual/account copy and export until corrected; the Update button is present.');
  console.log('PASS: CPIS competitor and Multi modes, DSA Beige, structured SEO after edits, console/foam generation, export and history restoration.');
}
