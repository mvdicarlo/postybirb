/**
 * PrimaryContent - Main content area that displays detail view for selected items.
 * Renders different content based on the current view state and selection.
 */

import { Box, LoadingOverlay } from '@mantine/core';
import { SubmissionType } from '@postybirb/types';
import '../../styles/layout.css';
import { isHomeViewState, type ViewState } from '../../types/view-state';
import { ComponentErrorBoundary } from '../error-boundary';
import { AccountsContent } from '../sections/accounts-section';
import { HomeContent } from '../sections/home-section';
import { SubmissionsContent } from '../sections/submissions-section';
import { TemplatesContent } from '../sections/templates-section';

interface PrimaryContentProps {
  /** Current view state */
  viewState: ViewState;
  /** Whether content is loading */
  // eslint-disable-next-line react/no-unused-prop-types
  loading?: boolean;
}

/**
 * Renders view-specific content based on current view state.
 */
function ViewContent({ viewState }: PrimaryContentProps) {
  if (isHomeViewState(viewState)) {
    return <HomeContent />;
  }

  switch (viewState.type) {
    case 'accounts':
      return <AccountsContent viewState={viewState} />;
    case 'file-submissions':
      return (
        <SubmissionsContent
          viewState={viewState}
          submissionType={SubmissionType.FILE}
        />
      );
    case 'message-submissions':
      return (
        <SubmissionsContent
          viewState={viewState}
          submissionType={SubmissionType.MESSAGE}
        />
      );
    case 'templates':
      return <TemplatesContent viewState={viewState} />;
    default:
      return <HomeContent />;
  }
}

/**
 * Main content area component.
 * Displays detail view for the currently selected item(s) in the active section.
 * Includes content navbar at the top for pagination and actions.
 */
export function PrimaryContent({
  viewState,
  loading = false,
}: PrimaryContentProps) {
  return (
    <Box className="postybirb__primary_content">
      {/* Content Navbar with Pagination */}
      {/* <ContentNavbar
        config={{
          showPagination: false,
          title: undefined,
        }}
      /> */}

      {/* Scrollable content area */}
      <Box
        id="postybirb__primary_content_area"
        className="postybirb__primary_content_area"
        pos="relative"
      >
        <LoadingOverlay
          visible={loading}
          overlayProps={{ radius: 'sm', blur: 2 }}
        />
        <ComponentErrorBoundary>
          <ViewContent viewState={viewState} />
        </ComponentErrorBoundary>
      </Box>
    </Box>
  );
}
