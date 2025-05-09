import { useCallback, useEffect, useState } from 'react';
import StoreManager, {
  IdBasedRecord,
  StoreManagerDataResult,
} from './store-manager';

export function useStore<S extends IdBasedRecord>(store: StoreManager<S>) {
  const [isLoading, setIsLoading] = useState<boolean>(!store.initLoadCompleted);
  const [state, setState] = useState<StoreManagerDataResult<S>>(
    store.getData(),
  );

  const onUpdate = useCallback((data: StoreManagerDataResult<S>) => {
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

  return { isLoading, state: state.data, map: state.map, reload };
}
