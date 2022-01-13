import { useState, useEffect, useCallback } from 'react';
import StoreManager from './store-manager';

function useStore<S>(store: StoreManager<S>) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [state, setState] = useState<S[]>(store.getData());

  useEffect(() => {
    const observer = store.updates.subscribe(setState);
    return () => {
      observer.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reload = useCallback(() => {
    if (!isLoading) {
      setIsLoading(true);
      store.refresh().finally(() => setIsLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  return { isLoading, state, reload };
}

export default useStore;
