// Kept separate from Electron so the entire update lifecycle can be tested.
function createUpdater({ updater, currentVersion, enabled, onState }) {
  let state = { currentVersion, status: enabled ? 'idle' : 'development', nextVersion: null, percent: 0 };
  let checking = false;
  const setState = (patch) => {
    state = { ...state, ...patch };
    onState({ ...state });
  };
  const fail = () => setState({ status: 'error', percent: 0 });
  updater.autoDownload = true;
  // Never interrupt an active session or install during Windows shutdown.
  updater.autoInstallOnAppQuit = false;
  updater.allowPrerelease = false;
  updater.allowDowngrade = false;
  updater.on('checking-for-update', () => setState({ status: 'checking', nextVersion: null, percent: 0 }));
  updater.on('update-available', (info) => setState({ status: 'downloading', nextVersion: info.version, percent: 0 }));
  updater.on('download-progress', (progress) => setState({ status: 'downloading', percent: Math.max(0, Math.min(100, Math.round(progress.percent || 0))) }));
  updater.on('update-downloaded', (info) => setState({ status: 'ready', nextVersion: info.version, percent: 100 }));
  updater.on('update-not-available', () => setState({ status: 'current', nextVersion: null, percent: 0 }));
  updater.on('error', fail);

  return {
    getState: () => ({ ...state }),
    async check() {
      if (!enabled || checking || ['downloading', 'ready', 'installing'].includes(state.status)) return { ...state };
      checking = true;
      setState({ status: 'checking', nextVersion: null, percent: 0 });
      try {
        const result = await updater.checkForUpdates();
        // Downloads finish separately from the manifest request.
        result?.downloadPromise?.catch(fail);
      } catch {
        fail();
      } finally {
        checking = false;
      }
      return { ...state };
    },
    install() {
      if (!enabled || state.status !== 'ready') return false;
      setState({ status: 'installing' });
      try {
        updater.quitAndInstall(false, true);
        return true;
      } catch {
        fail();
        return false;
      }
    },
  };
}

module.exports = { createUpdater };
