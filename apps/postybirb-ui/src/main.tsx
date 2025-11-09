import { RemoteConfig } from '@postybirb/utils/electron';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import App from './app/app';
import { CreateRouter } from './pages/routes';
import './styles.css';

function Root() {
  return <App />;
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById('root')!).render(
  <RouterProvider router={CreateRouter(<Root />)} />,
);

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

      setSpellCheckerEnabled(value: boolean): void;
      setSpellcheckerLanguages: (languages: string[]) => Promise<void>;
      getSpellcheckerLanguages: () => Promise<string[]>;
      getAllSpellcheckerLanguages: () => Promise<string[]>;
      getSpellcheckerWords: () => Promise<string[]>;
      setSpellcheckerWords: (words: string[]) => Promise<void>;
    };
  }
}
