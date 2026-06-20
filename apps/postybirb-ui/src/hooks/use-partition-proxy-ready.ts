import { useEffect, useState } from 'react';

/**
 * Applies persisted proxy settings to an Electron session partition before
 * mounting a webview. Returns false until the main process finishes.
 */
export function usePartitionProxyReady(
  partitionId: string,
  enabled = true,
): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setReady(false);
      return undefined;
    }

    let cancelled = false;
    setReady(false);

    window.electron
      ?.ensurePartitionProxy(partitionId)
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) {
          setReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [partitionId, enabled]);

  return ready;
}
