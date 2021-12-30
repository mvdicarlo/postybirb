import { useState, useEffect } from 'react';
import StoreManager from './store-manager';

function useStore<S>(store: StoreManager<S>) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [state, setState] = useState<S[]>(store.getData());

  useEffect(() => {
    const observer = store.updates.subscribe(setState);
    return () => {
      observer.unsubscribe();
    };
  }, []);

  function reload() {
    if (!isLoading) {
      setIsLoading(true);
      store.refresh().finally(() => setIsLoading(false));
    }
  }

  return { isLoading, state, reload };
}

export default useStore;
