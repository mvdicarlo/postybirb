/**
 * SectionPanel - Left panel that displays section-specific list content.
 * Renders different content based on the current view state.
 */

import { Box, ScrollArea } from '@mantine/core';
import '../../styles/layout.css';
import { getSectionPanelConfig, type ViewState } from '../../types/view-state';
import {
    AccountsSection,
    FileSubmissionsSection,
    MessageSubmissionsSection,
} from '../sections';

interface SectionPanelProps {
  /** Current view state */
  viewState: ViewState;
  /** Callback when an item is selected in the section panel */
  onItemSelect?: (itemId: string) => void;
}

/**
 * Renders section-specific content based on view state type.
 */
function SectionContent({ viewState, onItemSelect }: SectionPanelProps) {
  switch (viewState.type) {
    case 'accounts':
      return <AccountsSection viewState={viewState} onItemSelect={onItemSelect} />;
    case 'file-submissions':
      return <FileSubmissionsSection viewState={viewState} onItemSelect={onItemSelect} />;
    case 'message-submissions':
      return <MessageSubmissionsSection viewState={viewState} onItemSelect={onItemSelect} />;
    default:
      return null;
  }
}

/**
 * Left panel component that displays section-specific list content.
 * Only renders when the current view state has a section panel configured.
 */
export function SectionPanel({ viewState, onItemSelect }: SectionPanelProps) {
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
      <ScrollArea className="postybirb__section_panel_scroll" type="hover" scrollbarSize={6}>
        <SectionContent viewState={viewState} onItemSelect={onItemSelect} />
      </ScrollArea>
    </Box>
  );
}

