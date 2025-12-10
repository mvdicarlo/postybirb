/**
 * SectionPanel - Left panel that displays section-specific list content.
 * Renders different content based on the current view state.
 */

import { Box } from '@mantine/core';
import { SubmissionType } from '@postybirb/types';
import '../../styles/layout.css';
import { getSectionPanelConfig, type ViewState } from '../../types/view-state';
import { ComponentErrorBoundary } from '../error-boundary';
import { AccountsSection } from '../sections/accounts-section';
import { SubmissionsSection } from '../sections/submissions-section';

interface SectionPanelProps {
  /** Current view state */
  viewState: ViewState;
}

/**
 * Renders section-specific content based on view state type.
 */
function SectionContent({ viewState }: SectionPanelProps) {
  switch (viewState.type) {
    case 'accounts':
      return <AccountsSection viewState={viewState} />;
    case 'file-submissions':
      return (
        <SubmissionsSection
          viewState={viewState}
          submissionType={SubmissionType.FILE}
        />
      );
    case 'message-submissions':
      return (
        <SubmissionsSection
          viewState={viewState}
          submissionType={SubmissionType.MESSAGE}
        />
      );
    default:
      return null;
  }
}

/**
 * Left panel component that displays section-specific list content.
 * Only renders when the current view state has a section panel configured.
 */
export function SectionPanel({ viewState }: SectionPanelProps) {
  const config = getSectionPanelConfig(viewState);

  // Don't render if this section doesn't have a panel
  if (!config.hasPanel) {
    return null;
  }

  return (
    <Box
      className="postybirb__section_panel"
      style={{ width: config.defaultWidth }}
    >
      <ComponentErrorBoundary>
        <SectionContent viewState={viewState} />
      </ComponentErrorBoundary>
    </Box>
  );
}
