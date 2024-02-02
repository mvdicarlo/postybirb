import { useState, useEffect, useCallback } from 'react';
import StoreManager from './store-manager';

export function useStore<S>(store: StoreManager<S>) {
  const [isLoading, setIsLoading] = useState<boolean>(!store.initLoadCompleted);
  const [state, setState] = useState<S[]>(store.getData());

  const onUpdate = useCallback((data: S[]) => {
    setState(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const observer = store.updates.subscribe(onUpdate);
    return () => observer.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reload = useCallback(() => {
    if (!isLoading) {
      setIsLoading(true);
      store.refresh().finally(() => setIsLoading(false));
    }
  }, [isLoading, setIsLoading, store]);

  return { isLoading, state, reload };
}
