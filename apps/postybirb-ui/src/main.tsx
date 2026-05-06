import { RemoteConfig } from '@postybirb/utils/electron';
import { createRoot } from 'react-dom/client';
import { initializeAppInsightsUI } from './app-insights-ui';
import { PostyBirb } from './index';

// Initialize Application Insights for UI error tracking
initializeAppInsightsUI();

function Root() {
  return <PostyBirb />;
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById('root')!).render(<Root />);

window.addEventListener('keydown', (event) => {
  if (
    event.key === 'F5' ||
    (event.ctrlKey && event.key.toLowerCase() === 'r')
  ) {
    event.preventDefault();
    window.location.reload();
  }
});

const isFileDropEvent = (event: Event): boolean => {
  const dragEvent = event as DragEvent;
  const transferTypes = dragEvent.dataTransfer?.types;

  if (!transferTypes) {
    return false;
  }

  // eslint-disable-next-line lingui/no-unlocalized-strings
  return Array.from(transferTypes).includes('Files');
};

const preventUnhandledFileDropNavigation = (event: Event) => {
  if (event.defaultPrevented || !isFileDropEvent(event)) {
    return;
  }

  event.preventDefault();
};

window.addEventListener('dragover', preventUnhandledFileDropNavigation);
window.addEventListener('drop', preventUnhandledFileDropNavigation);

declare global {
  interface Window {
    electron: {
      getAppVersion(): Promise<string>;
      getLanIp(): Promise<string | undefined>;
      getRemoteConfig(): RemoteConfig;
      pickDirectory?(): Promise<string | undefined>;
      openExternalLink(url: string): void;
      getCookiesForAccount(accountId: string): Promise<string>;
      quit(code?: number): void;
      platform: NodeJS.Platform;
      app_port: string;
      app_version: string;

      setSpellCheckerEnabled(value: boolean): void;
      setSpellcheckerLanguages: (languages: string[]) => Promise<void>;
      getSpellcheckerLanguages: () => Promise<string[]>;
      getAllSpellcheckerLanguages: () => Promise<string[]>;
      getSpellcheckerWords: () => Promise<string[]>;
      setSpellcheckerWords: (words: string[]) => Promise<void>;
    };
  }
}
