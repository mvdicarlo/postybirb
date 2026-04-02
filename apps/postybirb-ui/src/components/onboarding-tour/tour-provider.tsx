/**
 * TourProvider - Wraps the app and manages Joyride tour rendering.
 * Reads active tour from the tour store and renders the appropriate steps.
 */

import { useCallback, useMemo } from 'react';
import { EVENTS, Joyride, STATUS, type Controls, type EventData } from 'react-joyride';
import { useActiveTourId, useTourActions, useTourStarted } from '../../stores/ui/tour-store';
import { MantineTooltip } from './mantine-tooltip';
import { LAYOUT_TOUR_ID, useLayoutTourSteps } from './tours/layout-tour';

/**
 * Map of tour IDs to their step hooks.
 * Add new tours here as they are created.
 */
function useTourSteps(tourId: string | null) {
  const layoutSteps = useLayoutTourSteps();

  return useMemo(() => {
    switch (tourId) {
      case LAYOUT_TOUR_ID:
        return layoutSteps;
      default:
        return [];
    }
  }, [tourId, layoutSteps]);
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const activeTourId = useActiveTourId();
  const tourStarted = useTourStarted();
  const { completeTour, skipTour, endTour } = useTourActions();
  const steps = useTourSteps(activeTourId);

  const handleEvent = useCallback(
    (data: EventData, _controls: Controls) => {
      const { type } = data;

      if (type === EVENTS.TOUR_STATUS) {
        const { status } = data;
        if (status === STATUS.FINISHED) {
          if (activeTourId) {
            completeTour(activeTourId);
          }
        } else if (status === STATUS.SKIPPED) {
          if (activeTourId) {
            skipTour(activeTourId);
          }
        }
      } else if (type === EVENTS.TOUR_END) {
        endTour();
      }
    },
    [activeTourId, completeTour, skipTour, endTour],
  );

  return (
    <>
      {children}
      <Joyride
        steps={steps}
        run={tourStarted && steps.length > 0}
        continuous
        onEvent={handleEvent}
        tooltipComponent={MantineTooltip}
        options={{
          overlayClickAction: false,
          // eslint-disable-next-line lingui/no-unlocalized-strings
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          buttons: ['skip', 'back', 'close', 'primary'],
        }}
      />
    </>
  );
}
