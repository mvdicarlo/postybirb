/**
 * PrimaryContent - Main content area that displays detail view for selected items.
 * Renders different content based on the current view state and selection.
 */

import { Trans } from '@lingui/react/macro';
import { Box, Center, LoadingOverlay, Stack, Text, Title } from '@mantine/core';
import { IconHome, IconInbox } from '@tabler/icons-react';
import '../../styles/layout.css';
import {
    isFileSubmissionsViewState,
    isHomeViewState,
    isMessageSubmissionsViewState,
    isTagConvertersViewState,
    isTagGroupsViewState,
    isUserConvertersViewState,
    type ViewState,
} from '../../types/view-state';
import { ContentNavbar } from './content-navbar';

interface PrimaryContentProps {
  /** Current view state */
  viewState: ViewState;
  /** Whether content is loading */
  loading?: boolean;
}

/**
 * Home view content - welcome/dashboard.
 */
function HomeContent() {
  return (
    <Center h="100%">
      <Stack align="center" gap="md">
        <IconHome size={64} stroke={1.5} opacity={0.5} />
        <Title order={2} c="dimmed">
          <Trans>Welcome to PostyBirb</Trans>
        </Title>
        <Text size="sm" c="dimmed" ta="center" maw={400}>
          <Trans>
            Select a section from the sidebar to get started, or create a new submission.
          </Trans>
        </Text>
      </Stack>
    </Center>
  );
}

/**
 * Empty state when no item is selected in a section.
 */
function EmptySelectionContent({ message }: { message: React.ReactNode }) {
  return (
    <Center h="100%">
      <Stack align="center" gap="md">
        <IconInbox size={64} stroke={1.5} opacity={0.3} />
        <Text size="sm" c="dimmed" ta="center">
          {message}
        </Text>
      </Stack>
    </Center>
  );
}

/**
 * File submissions detail content.
 */
function FileSubmissionsContent({ viewState }: { viewState: ViewState }) {
  if (!isFileSubmissionsViewState(viewState)) return null;

  const { selectedIds, mode } = viewState.params;

  if (selectedIds.length === 0) {
    return (
      <EmptySelectionContent
        message={<Trans>Select a submission from the list to view details</Trans>}
      />
    );
  }

  return (
    <Box p="md">
      <Title order={3}>
        <Trans>File Submission Details</Trans>
      </Title>
      <Text size="sm" c="dimmed" mt="sm">
        {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
        Mode: {mode} | Selected: {selectedIds.length} items
      </Text>
      <Text size="xs" c="dimmed" mt="xs">
        {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
        IDs: {selectedIds.join(', ') || 'none'}
      </Text>
    </Box>
  );
}

/**
 * Message submissions detail content.
 */
function MessageSubmissionsContent({ viewState }: { viewState: ViewState }) {
  if (!isMessageSubmissionsViewState(viewState)) return null;

  const { selectedIds, mode } = viewState.params;

  if (selectedIds.length === 0) {
    return (
      <EmptySelectionContent
        message={<Trans>Select a message from the list to view details</Trans>}
      />
    );
  }

  return (
    <Box p="md">
      <Title order={3}>
        <Trans>Message Submission Details</Trans>
      </Title>
      <Text size="sm" c="dimmed" mt="sm">
        {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
        Mode: {mode} | Selected: {selectedIds.length} items
      </Text>
      <Text size="xs" c="dimmed" mt="xs">
        {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
        IDs: {selectedIds.join(', ') || 'none'}
      </Text>
    </Box>
  );
}

/**
 * Tag groups detail content.
 */
function TagGroupsContent({ viewState }: { viewState: ViewState }) {
  if (!isTagGroupsViewState(viewState)) return null;

  const { selectedId } = viewState.params;

  if (!selectedId) {
    return (
      <EmptySelectionContent
        message={<Trans>Select a tag group from the list to view details</Trans>}
      />
    );
  }

  return (
    <Box p="md">
      <Title order={3}>
        <Trans>Tag Group Details</Trans>
      </Title>
      <Text size="sm" c="dimmed" mt="sm">
        {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
        ID: {selectedId}
      </Text>
    </Box>
  );
}

/**
 * Tag converters detail content.
 */
function TagConvertersContent({ viewState }: { viewState: ViewState }) {
  if (!isTagConvertersViewState(viewState)) return null;

  const { selectedId } = viewState.params;

  if (!selectedId) {
    return (
      <EmptySelectionContent
        message={<Trans>Select a tag converter from the list to view details</Trans>}
      />
    );
  }

  return (
    <Box p="md">
      <Title order={3}>
        <Trans>Tag Converter Details</Trans>
      </Title>
      <Text size="sm" c="dimmed" mt="sm">
        {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
        ID: {selectedId}
      </Text>
    </Box>
  );
}

/**
 * User converters detail content.
 */
function UserConvertersContent({ viewState }: { viewState: ViewState }) {
  if (!isUserConvertersViewState(viewState)) return null;

  const { selectedId } = viewState.params;

  if (!selectedId) {
    return (
      <EmptySelectionContent
        message={<Trans>Select a user converter from the list to view details</Trans>}
      />
    );
  }

  return (
    <Box p="md">
      <Title order={3}>
        <Trans>User Converter Details</Trans>
      </Title>
      <Text size="sm" c="dimmed" mt="sm">
        {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
        ID: {selectedId}
      </Text>
    </Box>
  );
}

/**
 * Renders view-specific content based on current view state.
 */
function ViewContent({ viewState }: PrimaryContentProps) {
  if (isHomeViewState(viewState)) {
    return <HomeContent />;
  }

  switch (viewState.type) {
    case 'file-submissions':
      return <FileSubmissionsContent viewState={viewState} />;
    case 'message-submissions':
      return <MessageSubmissionsContent viewState={viewState} />;
    case 'tag-groups':
      return <TagGroupsContent viewState={viewState} />;
    case 'tag-converters':
      return <TagConvertersContent viewState={viewState} />;
    case 'user-converters':
      return <UserConvertersContent viewState={viewState} />;
    default:
      return <HomeContent />;
  }
}

/**
 * Main content area component.
 * Displays detail view for the currently selected item(s) in the active section.
 * Includes content navbar at the top for pagination and actions.
 */
export function PrimaryContent({ viewState, loading = false }: PrimaryContentProps) {
  return (
    <Box className="postybirb__primary_content">
      {/* Content Navbar with Pagination */}
      <ContentNavbar
        config={{
          showPagination: false,
          title: undefined,
        }}
      />

      {/* Scrollable content area */}
      <Box className="postybirb__primary_content_area" pos="relative">
        <LoadingOverlay
          visible={loading}
          zIndex={10}
          overlayProps={{ radius: 'sm', blur: 2 }}
        />
        <ViewContent viewState={viewState} />
      </Box>
    </Box>
  );
}
