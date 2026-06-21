import { useEffect, useState } from 'react';

let globalProxyApplyPromise: Promise<void> | null = null;

function ensureGlobalProxyApplied(): Promise<void> {
  if (!globalProxyApplyPromise) {
    globalProxyApplyPromise =
      window.electron?.applyProxyConfig().catch(() => undefined) ??
      Promise.resolve();
  }

  return globalProxyApplyPromise;
}

/**
 * Ensures the main process has applied the global proxy config before
 * mounting webviews or other partition-scoped UI.
 */
export function useGlobalProxyReady(enabled = true): boolean {
  const [ready, setReady] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      setReady(false);
      return undefined;
    }

    let cancelled = false;
    setReady(false);

    ensureGlobalProxyApplied().finally(() => {
      if (!cancelled) {
        setReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return ready;
}

/** Clears the cached apply promise (e.g. after proxy settings change). */
export function resetGlobalProxyReadyCache(): void {
  globalProxyApplyPromise = null;
}
