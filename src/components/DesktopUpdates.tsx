import { useEffect, useState } from 'react';

export function DesktopUpdates() {
  const [state, setState] = useState<DesktopUpdateState | null>(null);
  const [bridgeError, setBridgeError] = useState(false);
  useEffect(() => {
    const updater = window.desktopUpdater;
    if (!updater) return;
    let active = true;
    let receivedEvent = false;
    const unsubscribe = updater.subscribe((next) => {
      receivedEvent = true;
      if (active) { setState(next); setBridgeError(false); }
    });
    void updater.getState().then((next) => {
      if (active && !receivedEvent) setState(next);
    }).catch(() => { if (active) setBridgeError(true); });
    return () => { active = false; unsubscribe(); };
  }, []);
  if (!window.desktopUpdater) return null;
  if (!state) return <div className="desktop-updates" role="status">{bridgeError ? 'Update service unavailable. Restart the app to try again.' : 'Loading desktop version…'}</div>;
  const messages: Record<DesktopUpdateState['status'], string> = {
    idle: 'Updates are checked automatically.',
    development: 'Local preview · updates available in the installed app.',
    checking: 'Checking for updates…',
    current: 'You have the latest version.',
    downloading: `Downloading version ${state.nextVersion}… ${state.percent}%`,
    ready: `Version ${state.nextVersion} is ready. Save your work before restarting.`,
    installing: 'Restarting to install the update…',
    error: 'Could not get updates. Check your internet connection and try again. You can keep working offline.',
  };
  const busy = ['checking', 'downloading', 'installing', 'development'].includes(state.status);
  const invoke = (action: () => Promise<unknown>) => {
    setBridgeError(false);
    void action().catch(() => setBridgeError(true));
  };
  return (
    <aside className="desktop-updates" aria-label="Application updates">
      <strong>Desktop v{state.currentVersion}</strong>
      <span role="status">{bridgeError ? 'Update service unavailable. Try again.' : messages[state.status]}</span>
      {state.status === 'ready' ? (
        <button type="button" className="btn btn-secondary" onClick={() => invoke(() => window.desktopUpdater!.install())}>Update and restart</button>
      ) : (
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => invoke(() => window.desktopUpdater!.check())}>Update</button>
      )}
    </aside>
  );
}
