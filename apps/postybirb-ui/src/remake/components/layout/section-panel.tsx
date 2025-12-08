/**
 * SectionPanel - Left panel that displays section-specific list content.
 * Renders different content based on the current view state.
 */

import { Trans } from '@lingui/react/macro';
import { Box, ScrollArea, Text } from '@mantine/core';
import '../../styles/layout.css';
import {
    getSectionPanelConfig,
    isFileSubmissionsViewState,
    isMessageSubmissionsViewState,
    isTagConvertersViewState,
    isTagGroupsViewState,
    isUserConvertersViewState,
    type ViewState,
} from '../../types/view-state';

interface SectionPanelProps {
  /** Current view state */
  viewState: ViewState;
  /** Callback when an item is selected in the section panel */
  onItemSelect?: (itemId: string) => void;
}

/**
 * Placeholder content for file submissions section.
 */
function FileSubmissionsSection({ viewState, onItemSelect }: SectionPanelProps) {
  return (
    <Box p="md">
      <Text size="sm" c="dimmed">
        <Trans>File Submissions List</Trans>
      </Text>
      <Text size="xs" c="dimmed" mt="xs">
        {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
        Selected: {isFileSubmissionsViewState(viewState) ? viewState.params.selectedIds.length : 0} items
      </Text>
    </Box>
  );
}

/**
 * Placeholder content for message submissions section.
 */
function MessageSubmissionsSection({ viewState, onItemSelect }: SectionPanelProps) {
  return (
    <Box p="md">
      <Text size="sm" c="dimmed">
        <Trans>Message Submissions List</Trans>
      </Text>
      <Text size="xs" c="dimmed" mt="xs">
        {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
        Selected: {isMessageSubmissionsViewState(viewState) ? viewState.params.selectedIds.length : 0} items
      </Text>
    </Box>
  );
}

/**
 * Placeholder content for tag groups section.
 */
function TagGroupsSection({ viewState, onItemSelect }: SectionPanelProps) {
  return (
    <Box p="md">
      <Text size="sm" c="dimmed">
        <Trans>Tag Groups List</Trans>
      </Text>
      <Text size="xs" c="dimmed" mt="xs">
        {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
        Selected: {isTagGroupsViewState(viewState) ? viewState.params.selectedId || 'none' : 'none'}
      </Text>
    </Box>
  );
}

/**
 * Placeholder content for tag converters section.
 */
function TagConvertersSection({ viewState, onItemSelect }: SectionPanelProps) {
  return (
    <Box p="md">
      <Text size="sm" c="dimmed">
        <Trans>Tag Converters List</Trans>
      </Text>
      <Text size="xs" c="dimmed" mt="xs">
        {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
        Selected: {isTagConvertersViewState(viewState) ? viewState.params.selectedId || 'none' : 'none'}
      </Text>
    </Box>
  );
}

/**
 * Placeholder content for user converters section.
 */
function UserConvertersSection({ viewState, onItemSelect }: SectionPanelProps) {
  return (
    <Box p="md">
      <Text size="sm" c="dimmed">
        <Trans>User Converters List</Trans>
      </Text>
      <Text size="xs" c="dimmed" mt="xs">
        {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
        Selected: {isUserConvertersViewState(viewState) ? viewState.params.selectedId || 'none' : 'none'}
      </Text>
    </Box>
  );
}

/**
 * Renders section-specific content based on view state type.
 */
function SectionContent({ viewState, onItemSelect }: SectionPanelProps) {
  switch (viewState.type) {
    case 'file-submissions':
      return <FileSubmissionsSection viewState={viewState} onItemSelect={onItemSelect} />;
    case 'message-submissions':
      return <MessageSubmissionsSection viewState={viewState} onItemSelect={onItemSelect} />;
    case 'tag-groups':
      return <TagGroupsSection viewState={viewState} onItemSelect={onItemSelect} />;
    case 'tag-converters':
      return <TagConvertersSection viewState={viewState} onItemSelect={onItemSelect} />;
    case 'user-converters':
      return <UserConvertersSection viewState={viewState} onItemSelect={onItemSelect} />;
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
