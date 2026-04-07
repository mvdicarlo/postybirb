/**
 * TourProvider - Wraps the app and manages Joyride tour rendering.
 * Reads active tour from the tour store and renders the appropriate steps.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { EVENTS, Joyride, STATUS, type Controls, type EventData } from 'react-joyride';
import { useActiveTourId, useIsTourCompleted, useTourActions, useTourStarted } from '../../stores/ui/tour-store';
import { MantineTooltip } from './mantine-tooltip';
import { ACCOUNTS_TOUR_ID, useAccountsTourSteps } from './tours/accounts-tour';
import { CUSTOM_SHORTCUTS_TOUR_ID, useCustomShortcutsTourSteps } from './tours/custom-shortcuts-tour';
import { FILE_WATCHERS_TOUR_ID, useFileWatchersTourSteps } from './tours/file-watchers-tour';
import { HOME_TOUR_ID, useHomeTourSteps } from './tours/home-tour';
import { LAYOUT_TOUR_ID, useLayoutTourSteps } from './tours/layout-tour';
import { NOTIFICATIONS_TOUR_ID, useNotificationsTourSteps } from './tours/notifications-tour';
import { SCHEDULE_TOUR_ID, useScheduleTourSteps } from './tours/schedule-tour';
import { SUBMISSION_EDIT_TOUR_ID, useSubmissionEditTourSteps } from './tours/submission-edit-tour';
import { SUBMISSIONS_TOUR_ID, useSubmissionsTourSteps } from './tours/submissions-tour';
import { TAG_CONVERTERS_TOUR_ID, useTagConvertersTourSteps } from './tours/tag-converters-tour';
import { TAG_GROUPS_TOUR_ID, useTagGroupsTourSteps } from './tours/tag-groups-tour';
import { TEMPLATES_TOUR_ID, useTemplatesTourSteps } from './tours/templates-tour';
import { USER_CONVERTERS_TOUR_ID, useUserConvertersTourSteps } from './tours/user-converters-tour';

/**
 * Map of tour IDs to their step hooks.
 * Add new tours here as they are created.
 */
function useTourSteps(tourId: string | null) {
  const layoutSteps = useLayoutTourSteps();
  const accountsSteps = useAccountsTourSteps();
  const homeSteps = useHomeTourSteps();
  const templatesSteps = useTemplatesTourSteps();
  const tagGroupsSteps = useTagGroupsTourSteps();
  const customShortcutsSteps = useCustomShortcutsTourSteps();
  const fileWatchersSteps = useFileWatchersTourSteps();
  const scheduleSteps = useScheduleTourSteps();
  const submissionsSteps = useSubmissionsTourSteps();
  const submissionEditSteps = useSubmissionEditTourSteps();
  const tagConvertersSteps = useTagConvertersTourSteps();
  const userConvertersSteps = useUserConvertersTourSteps();
  const notificationsSteps = useNotificationsTourSteps();

  return useMemo(() => {
    switch (tourId) {
      case LAYOUT_TOUR_ID:
        return layoutSteps;
      case ACCOUNTS_TOUR_ID:
        return accountsSteps;
      case HOME_TOUR_ID:
        return homeSteps;
      case TEMPLATES_TOUR_ID:
        return templatesSteps;
      case TAG_GROUPS_TOUR_ID:
        return tagGroupsSteps;
      case CUSTOM_SHORTCUTS_TOUR_ID:
        return customShortcutsSteps;
      case FILE_WATCHERS_TOUR_ID:
        return fileWatchersSteps;
      case SCHEDULE_TOUR_ID:
        return scheduleSteps;
      case SUBMISSIONS_TOUR_ID:
        return submissionsSteps;
      case SUBMISSION_EDIT_TOUR_ID:
        return submissionEditSteps;
      case TAG_CONVERTERS_TOUR_ID:
        return tagConvertersSteps;
      case USER_CONVERTERS_TOUR_ID:
        return userConvertersSteps;
      case NOTIFICATIONS_TOUR_ID:
        return notificationsSteps;
      default:
        return [];
    }
  }, [tourId, layoutSteps, accountsSteps, homeSteps, templatesSteps, tagGroupsSteps, customShortcutsSteps, fileWatchersSteps, scheduleSteps, submissionsSteps, submissionEditSteps, tagConvertersSteps, userConvertersSteps, notificationsSteps]);
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const activeTourId = useActiveTourId();
  const tourStarted = useTourStarted();
  const { completeTour, skipTour, endTour, startTour } = useTourActions();
  const layoutTourCompleted = useIsTourCompleted(LAYOUT_TOUR_ID);
  const allSteps = useTourSteps(activeTourId);

  // Auto-start layout tour on first app load if never completed
  useEffect(() => {
    if (!layoutTourCompleted && !tourStarted) {
      // Small delay to ensure the DOM is fully rendered
      const timer = setTimeout(() => startTour(LAYOUT_TOUR_ID), 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter out steps whose target elements don't exist in the DOM.
  // This handles conditional UI like the file dropzone (only for file submissions)
  // or file management section (only for file submission edit cards).
  const steps = useMemo(
    () =>
      allSteps.filter((step) => {
        if (typeof step.target !== 'string') return true;
        if (step.target === 'body') return true;
        return document.querySelector(step.target) !== null;
      }),
    [allSteps],
  );

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
        // Mark as completed on any close to ensure the localStorage flag is set
        if (activeTourId) {
          completeTour(activeTourId);
        }
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
          zIndex: 10000,
          scrollOffset: 80,
        }}
      />
    </>
  );
}
