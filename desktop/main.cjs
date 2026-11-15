const { app, BrowserWindow, dialog, ipcMain, Menu, net, protocol, session } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { autoUpdater } = require('electron-updater');
const { APP_URL, CONTENT_SECURITY_POLICY, isAppDocument, resolveAsset } = require('./security.cjs');
const { createUpdater } = require('./updater.cjs');

// Stable across versions: updates must retain account settings and saved history.
app.setName('Title Generator');
app.setPath('userData', process.env.TITLE_GENERATOR_TEST_PROFILE || path.join(app.getPath('appData'), 'USF Title Generator'));
app.setAppUserModelId('com.unitedseatfactory.titlegenerator');
protocol.registerSchemesAsPrivileged([{ scheme: 'sctg', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

let window;
let updates;
let installDialogOpen = false;

function trustedSender(event) {
  return window && !window.isDestroyed() && event.sender === window.webContents
    && event.senderFrame === window.webContents.mainFrame && isAppDocument(event.senderFrame.url);
}

function handle(channel, callback) {
  ipcMain.handle(channel, (event) => {
    if (!trustedSender(event)) throw new Error('Untrusted update request');
    return callback();
  });
}

async function confirmInstall() {
  if (installDialogOpen || updates.getState().status !== 'ready') return false;
  installDialogOpen = true;
  try {
    const result = await dialog.showMessageBox(window, {
      type: 'question', title: 'Install Title Generator update',
      message: `Version ${updates.getState().nextVersion} is ready.`,
      detail: 'Save your current work to History or export it before restarting. Saved history and account settings are kept.',
      buttons: ['Keep working', 'Restart and install'], defaultId: 0, cancelId: 0,
      noLink: true,
    });
    if (result.response !== 1) return false;
    session.defaultSession.flushStorageData();
    return updates.install();
  } finally {
    installDialogOpen = false;
  }
}

function createWindow() {
  window = new BrowserWindow({
    title: 'Title Generator', width: 1440, height: 980, minWidth: 1000, minHeight: 700,
    backgroundColor: '#eef1f6', show: false,
    icon: path.join(__dirname, '../build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true, sandbox: true, nodeIntegration: false,
      webSecurity: true, webviewTag: false,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (!isAppDocument(url)) event.preventDefault();
  });
  window.webContents.on('will-attach-webview', (event) => event.preventDefault());
  window.once('ready-to-show', () => window.show());
  window.loadURL(APP_URL);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!window || window.isDestroyed()) return;
    if (window.isMinimized()) window.restore();
    window.focus();
  });
  app.whenReady().then(() => {
    const dist = path.join(app.getAppPath(), 'dist');
    protocol.handle('sctg', async (request) => {
      const file = resolveAsset(dist, request.url);
      if (!file || request.method !== 'GET') return new Response('Not found', { status: 404 });
      try {
        const response = await net.fetch(pathToFileURL(file).toString());
        const headers = new Headers(response.headers);
        headers.set('Content-Security-Policy', CONTENT_SECURITY_POLICY);
        headers.set('X-Content-Type-Options', 'nosniff');
        return new Response(response.body, { status: response.status, headers });
      } catch {
        return new Response('Not found', { status: 404 });
      }
    });
    session.defaultSession.setPermissionRequestHandler((_contents, permission, callback) => {
      callback(permission === 'clipboard-sanitized-write');
    });
    session.defaultSession.setPermissionCheckHandler((_contents, permission) => permission === 'clipboard-sanitized-write');
    updates = createUpdater({
      updater: autoUpdater, currentVersion: app.getVersion(),
      enabled: app.isPackaged && process.env.TITLE_GENERATOR_DISABLE_UPDATES !== '1',
      onState: (state) => {
        if (window && !window.isDestroyed()) window.webContents.send('updates:changed', state);
      },
    });
    handle('updates:state', () => updates.getState());
    handle('updates:check', () => updates.check());
    handle('updates:install', confirmInstall);
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: 'File', submenu: [{ role: 'quit' }] },
      { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
      { label: 'View', submenu: [{ role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'togglefullscreen' }] },
      { label: 'Help', submenu: [
        { label: `Title Generator ${app.getVersion()}`, enabled: false },
        { label: 'Check for updates', click: () => { void updates.check(); } },
      ] },
    ]));
    createWindow();
    const startupCheck = setTimeout(() => { void updates.check(); }, 5000);
    const periodicCheck = setInterval(() => { void updates.check(); }, 4 * 60 * 60 * 1000);
    startupCheck.unref();
    periodicCheck.unref();
    app.on('before-quit', () => {
      clearTimeout(startupCheck);
      clearInterval(periodicCheck);
      session.defaultSession.flushStorageData();
    });
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  }).catch((error) => {
    dialog.showErrorBox('Title Generator could not start', error.message);
    app.quit();
  });
}
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
