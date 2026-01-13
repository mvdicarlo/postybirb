import { RemoteConfig } from '@postybirb/utils/electron';
import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeAppInsightsUI } from './app-insights-ui';
import { getUIMode } from './shared/ui-mode';

// Lazy load both UIs - CSS is bundled with each chunk
const RemakeUI = React.lazy(() => import('./remake'));
const LegacyUI = React.lazy(() => import('./app/app'));

// Initialize Application Insights for UI error tracking
initializeAppInsightsUI();

// Read UI mode synchronously before render
const uiMode = getUIMode();

function LoadingFallback() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        backgroundColor: '#1a1b1e',
        color: '#c1c2c5',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        overflow: 'hidden',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid #373a40',
            borderTopColor: '#228be6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }}
        />
        {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
        <div>Loading...</div>
      </div>
    </div>
  );
}

function Root() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      {uiMode === 'legacy' ? <LegacyUI /> : <RemakeUI />}
    </Suspense>
  );
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
