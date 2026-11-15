const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const path = require('node:path');
const { resolveAsset, isAppDocument } = require('../desktop/security.cjs');
const { createUpdater } = require('../desktop/updater.cjs');

test('only the application and built assets can be read through the desktop protocol', () => {
  const root = path.resolve('dist');
  assert.equal(resolveAsset(root, 'sctg://app/index.html'), path.join(root, 'index.html'));
  assert.equal(resolveAsset(root, 'sctg://app/assets/index-ab12.js'), path.join(root, 'assets/index-ab12.js'));
  for (const url of [
    'file:///etc/passwd', 'https://app/index.html', 'sctg://other/index.html',
    'sctg://app:123/index.html', 'sctg://user@app/index.html',
    'sctg://app/package.json', 'sctg://app/desktop/main.cjs',
    'sctg://app/assets/../../package.json', 'sctg://app/assets/%2e%2e%2fpackage.json',
    'sctg://app/assets/%2e%2e%5cmain.js', 'sctg://app/assets/%00.js', 'sctg://app/%zz',
  ]) assert.equal(resolveAsset(root, url), null, url);
});

test('only the main app document may call update IPC', () => {
  assert.equal(isAppDocument('sctg://app/index.html'), true);
  for (const url of ['https://example.com', 'sctg://app/assets/index.js', 'sctg://user@app/index.html', 'sctg://app.evil/index.html', 'invalid']) {
    assert.equal(isAppDocument(url), false);
  }
});

function fixture(check, enabled = true) {
  const updater = new EventEmitter();
  let checks = 0;
  let installs = 0;
  const states = [];
  updater.checkForUpdates = async () => { checks++; return check?.(updater); };
  updater.quitAndInstall = (silent, restart) => { assert.equal(silent, false); assert.equal(restart, true); installs++; };
  const controller = createUpdater({ updater, currentVersion: '3.1.0', enabled, onState: (state) => states.push(state) });
  return { updater, controller, states, checks: () => checks, installs: () => installs };
}

test('downloads updates without interrupting work; installs only once when ready', async () => {
  const f = fixture((updater) => { updater.emit('update-available', { version: '3.1.1' }); });
  assert.equal(f.updater.autoDownload, true);
  assert.equal(f.updater.autoInstallOnAppQuit, false);
  assert.equal(f.updater.allowDowngrade, false);
  assert.equal(f.controller.install(), false);
  await f.controller.check();
  assert.equal(f.controller.getState().status, 'downloading');
  await f.controller.check();
  assert.equal(f.checks(), 1);
  f.updater.emit('download-progress', { percent: 42.6 });
  assert.equal(f.controller.getState().percent, 43);
  f.updater.emit('update-downloaded', { version: '3.1.1' });
  await f.controller.check();
  assert.equal(f.checks(), 1);
  assert.equal(f.installs(), 0);
  assert.equal(f.controller.install(), true);
  assert.equal(f.controller.install(), false);
  assert.equal(f.installs(), 1);
});

test('offline errors are recoverable and do not expose exception contents', async () => {
  let offline = true;
  const f = fixture((updater) => {
    if (offline) throw new Error('private diagnostics');
    updater.emit('update-not-available');
  });
  await f.controller.check();
  assert.equal(f.controller.getState().status, 'error');
  assert.ok(!JSON.stringify(f.states).includes('private diagnostics'));
  offline = false;
  await f.controller.check();
  assert.equal(f.controller.getState().status, 'current');
  assert.equal(f.checks(), 2);
});

test('concurrent update requests share the running check', async () => {
  let finish;
  const f = fixture(() => new Promise((resolve) => { finish = resolve; }));
  const first = f.controller.check();
  await f.controller.check();
  assert.equal(f.checks(), 1);
  finish(null);
  await first;
});

test('a failed background download can be retried', async () => {
  const f = fixture((updater) => {
    updater.emit('update-available', { version: '3.1.1' });
    return { downloadPromise: Promise.reject(new Error('checksum mismatch')) };
  });
  await f.controller.check();
  await Promise.resolve();
  assert.equal(f.controller.getState().status, 'error');
  assert.equal(f.controller.install(), false);
  await f.controller.check();
  assert.equal(f.checks(), 2);
});

test('development and smoke tests never contact the updater', async () => {
  const f = fixture(null, false);
  await f.controller.check();
  assert.equal(f.controller.getState().status, 'development');
  assert.equal(f.checks(), 0);
  assert.equal(f.controller.install(), false);
});
