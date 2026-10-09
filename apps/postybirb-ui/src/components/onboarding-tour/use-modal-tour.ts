import { useEffect } from 'react';
import {
    useActiveTourId,
    useIsTourCompleted,
    useTourActions,
    useTourStore,
} from '../../stores/ui/tour-store';

export function useModalTour(tourId: string, opened: boolean, ready: boolean) {
  const activeTourId = useActiveTourId();
  const completed = useIsTourCompleted(tourId);
  const { startTour } = useTourActions();

  useEffect(() => {
    if (!opened || !ready || completed || activeTourId) return undefined;

    const timer = setTimeout(() => startTour(tourId), 300);
    return () => clearTimeout(timer);
  }, [activeTourId, completed, opened, ready, startTour, tourId]);

  useEffect(() => () => {
    const store = useTourStore.getState();
    if (store.activeTourId === tourId) store.endTour();
  }, [opened, tourId]);

  return {
    isActive: activeTourId === tourId,
    startTour: () => startTour(tourId),
  };
}