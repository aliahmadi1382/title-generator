import { _electron as electron } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { exerciseCpis } from './smoke-cpis.mjs';

await mkdir('test-results', { recursive: true });
const profile = await mkdtemp(path.join(os.tmpdir(), 'title-generator-smoke-'));
const output = path.resolve('test-results');
const downloads = await mkdtemp(path.join(output, 'downloads-'));
const env = { ...process.env, TITLE_GENERATOR_TEST_PROFILE: profile, TITLE_GENERATOR_DISABLE_UPDATES: '1' };
delete env.ELECTRON_RUN_AS_NODE;
const launch = () => electron.launch({
  ...(process.env.TITLE_GENERATOR_EXE ? { executablePath: process.env.TITLE_GENERATOR_EXE, args: [] } : { args: ['.'] }),
  env, timeout: 60000,
});
let app;
const errors = [];
let downloadCount = 0;
async function downloadFile(button) {
  const destination = downloadCount++ === 0 ? downloads : await mkdtemp(path.join(downloads, 'export-'));
  await app.evaluate(({ app, session }, destination) => {
    app.smokeDownload = new Promise((resolve) => {
      session.defaultSession.once('will-download', (_event, item) => {
        item.setSavePath(`${destination}/${item.getFilename()}`);
        item.once('done', (_doneEvent, state) => resolve(state));
      });
    });
  }, destination);
  await button.click();
  assert.equal(await app.evaluate(({ app }) => app.smokeDownload), 'completed');
}
try {
  app = await launch();
  let page = await app.firstWindow();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.getByRole('heading', { name: 'Seat Cover Title Generator', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => typeof window.require), 'undefined');
  const prefs = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences());
  assert.equal(prefs.sandbox, true);
  assert.equal(prefs.contextIsolation, true);
  assert.equal(prefs.nodeIntegration, false);
  const snapshot = await page.evaluate(() => window.desktopUpdater.getState());
  assert.equal(snapshot.status, 'development');
  // All generation and exports must work without a network connection.
  await page.context().setOffline(true);
  for (const [placeholder, value] of [['2000-2010', '2007-2011'], ['Chevy', 'Toyota'], ['Silverado 1500', 'Camry'], ['Genuine Leather', 'Leather'], ['Tan', 'Gray']]) {
    await page.getByPlaceholder(placeholder, { exact: true }).fill(value);
    await page.keyboard.press('Tab');
  }
  await page.getByRole('button', { name: 'Generate Main 9 Variations', exact: true }).click();
  await page.getByRole('button', { name: 'Save to History', exact: true }).click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('sctg.history.v1') || '[]').length === 1);
  const history = await page.evaluate(() => JSON.parse(localStorage.getItem('sctg.history.v1')));
  assert.equal(history[0].mainBlocks.length, 8);
  assert.equal(history[0].mainBlocks.flatMap((block) => block.titles).length, 72);
  for (const title of history[0].mainBlocks.flatMap((block) => block.titles)) {
    assert.match(title.title, /Leather/);
    assert.match(title.title, /Camry/);
  }
  // Exercise real Blob downloads; set only their destination to avoid a native dialog in CI.
  await downloadFile(page.getByRole('button', { name: 'Export Main 9 Titles', exact: true }));
  const csv = await readFile(path.join(downloads, 'variation-matrix-main9.csv'), 'utf8');
  assert.match(csv.split('\r\n')[0], /^account_name,variation_name,year_range,make,model/);
  assert.equal(csv.trim().split('\r\n').length, 73);
  assert.match(csv, /Toyota/);
  await page.getByRole('button', { name: 'Expand All', exact: true }).click();
  await page.bringToFront();
  await page.getByRole('button', { name: 'Copy title', exact: true }).first().click();
  // The click starts an asynchronous Clipboard API write. Wait for its UI
  // acknowledgement before reading the OS clipboard, especially on fast CI.
  await page.getByRole('button', { name: 'Copy title', exact: true }).first().getByText('Copied', { exact: true }).waitFor();
  assert.match(await app.evaluate(({ clipboard }) => clipboard.readText()), /Camry/);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(output, 'desktop-matrix.png') });

  await page.getByRole('button', { name: 'SEO', exact: true }).click();
  await page.getByRole('radio', { name: /^From Variation Matrix/ }).check();
  await page.getByRole('button', { name: 'Generate SEO', exact: true }).click();
  assert.ok((await page.getByRole('textbox', { name: 'Meta Tags', exact: true }).inputValue()).length > 20);
  await downloadFile(page.getByRole('button', { name: 'Export SEO CSV' }));

  await page.getByRole('button', { name: 'CSV Account Title Generator', exact: true }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'sample.csv', mimeType: 'text/csv',
    buffer: Buffer.from('item_id,title\nTEST-001,2007-2011 Toyota Camry Driver Bottom Leather Seat Cover Gray\n'),
  });
  await page.getByRole('button', { name: 'Convert Titles', exact: true }).click();
  await page.getByRole('textbox', { name: 'New title for item TEST-001', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click();
  const settingsBefore = await page.evaluate(() => localStorage.getItem('sctg.accounts.v1'));
  await app.close();
  app = await launch();
  page = await app.firstWindow();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.getByRole('button', { name: 'Switch to light mode', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('sctg.accounts.v1')), settingsBefore);
  await page.getByRole('button', { name: /^History/ }).click();
  await page.getByRole('button', { name: 'Reopen', exact: true }).click();
  assert.equal(await page.getByPlaceholder('Silverado 1500', { exact: true }).inputValue(), 'Camry');
  await page.getByRole('button', { name: /^Account Settings/ }).click();
  await page.getByRole('heading', { name: 'Account Settings', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Rules Summary', exact: true }).click();
  await page.getByRole('heading', { name: /Rules/ }).first().waitFor();
  await exerciseCpis(page, downloadFile);
  assert.deepEqual(errors, []);
  console.log('PASS: sandbox, 72 titles, offline generation, CSV download/import, clipboard, SEO, saved history, settings and theme after restart.');
} catch (error) {
  if (app) {
    const page = await app.firstWindow();
    await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
  }
  throw error;
} finally {
  if (app) await app.close();
}
