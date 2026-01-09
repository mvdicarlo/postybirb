import { RemoteConfig } from '@postybirb/utils/electron';
import { createRoot } from 'react-dom/client';
import { initializeAppInsightsUI } from './app-insights-ui';
import { PostyBirb } from './remake';
import './styles.css';

// Initialize Application Insights for UI error tracking
initializeAppInsightsUI();

function Root() {
  return <PostyBirb />;
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById('root')!).render(<Root />);

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
      platform: string;
      app_port: string;
      app_version: string;
    };
  }
}
