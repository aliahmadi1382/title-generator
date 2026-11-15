interface DesktopUpdateState {
  currentVersion: string;
  status: 'idle' | 'development' | 'checking' | 'current' | 'downloading' | 'ready' | 'installing' | 'error';
  nextVersion: string | null;
  percent: number;
}

interface Window {
  desktopUpdater?: {
    getState(): Promise<DesktopUpdateState>;
    check(): Promise<DesktopUpdateState>;
    install(): Promise<boolean>;
    subscribe(callback: (state: DesktopUpdateState) => void): () => void;
  };
}
