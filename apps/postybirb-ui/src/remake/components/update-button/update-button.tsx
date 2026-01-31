/**
 * UpdateButton - Shows app update availability and handles the update process.
 * Displays in the side navigation when an update is available.
 * Opens a modal for update details and actions.
 */

import { Trans } from '@lingui/react/macro';
import { Box, NavLink as MantineNavLink, Text, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { UPDATE_UPDATES } from '@postybirb/socket-events';
import { UpdateState } from '@postybirb/types';
import { IconDeviceDesktopUp, IconDownload } from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import updateApi from '../../api/update.api';
import AppSocket from '../../transports/websocket';
import { UpdateModal } from './update-modal';

interface UpdateButtonProps {
  /** Whether the sidenav is collapsed */
  collapsed: boolean;
}

/**
 * Check if running in development mode for testing.
 */
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Mock update state for testing in development environment.
 * Simulates an available update with release notes.
 */
/* eslint-disable lingui/no-unlocalized-strings */
const MOCK_UPDATE_STATE: UpdateState = {
  updateAvailable: true,
  updateDownloaded: false,
  updateDownloading: false,
  updateError: undefined,
  updateProgress: 0,
  updateNotes: [
    {
      version: '4.2.0',
      note: '<ul><li>New feature: Improved update UI with modal</li><li>Bug fix: Fixed submission ordering</li><li>Enhancement: Better error handling</li></ul>',
    },
    {
      version: '4.1.5',
      note: '<ul><li>Performance improvements</li><li>Fixed memory leak in file uploads</li></ul>',
    },
    {
      version: '4.1.4',
      note: '<ul><li>Minor bug fixes</li><li>Updated translations</li></ul>',
    },
  ],
};
/* eslint-enable lingui/no-unlocalized-strings */

/**
 * Update button component that displays when an app update is available.
 * Opens a modal with update details and action buttons.
 * In development mode, shows mock data for testing.
 */
export function UpdateButton({ collapsed }: UpdateButtonProps) {
  const [modalOpened, modal] = useDisclosure(false);
  const [updateState, setUpdateState] = useState<UpdateState>(
    isDevelopment ? MOCK_UPDATE_STATE : {},
  );
  const [mockDownloading, setMockDownloading] = useState(false);
  const [mockProgress, setMockProgress] = useState(0);
  const [mockDownloaded, setMockDownloaded] = useState(false);

  // Initial fetch of update state (disabled in dev mode)
  const { data: initialUpdate } = useQuery(
    'update',
    () => updateApi.checkForUpdates().then((res) => res.body),
    {
      refetchInterval: 5 * 60_000, // Fallback polling every 5 minutes
      enabled: !isDevelopment, // Disable in dev mode to use mock data
      onSuccess: (data) => {
        if (data) {
          setUpdateState(data);
        }
      },
    },
  );

  // Subscribe to real-time update events
  useEffect(() => {
    const handleUpdateEvent = (data: UpdateState) => {
      setUpdateState(data);
    };

    AppSocket.on(UPDATE_UPDATES, handleUpdateEvent);

    return () => {
      AppSocket.off(UPDATE_UPDATES, handleUpdateEvent);
    };
  }, []);

  // Simulate download progress in development mode
  useEffect(() => {
    if (!isDevelopment || !mockDownloading) return undefined;

    const interval = setInterval(() => {
      setMockProgress((prev) => {
        const next = prev + Math.random() * 15;
        if (next >= 100) {
          setMockDownloading(false);
          setMockDownloaded(true);
          clearInterval(interval);
          return 100;
        }
        return next;
      });
    }, 300);

    return () => clearInterval(interval);
  }, [mockDownloading]);

  // Update mock state when simulating download
  useEffect(() => {
    if (!isDevelopment) return;

    setUpdateState((prev) => ({
      ...prev,
      updateDownloading: mockDownloading,
      updateDownloaded: mockDownloaded,
      updateProgress: mockProgress,
    }));
  }, [mockDownloading, mockDownloaded, mockProgress]);

  // Handler for mock download in development
  const handleMockStartDownload = useCallback(() => {
    if (isDevelopment && !mockDownloading && !mockDownloaded) {
      setMockDownloading(true);
      setMockProgress(0);
    }
  }, [mockDownloading, mockDownloaded]);

  // Use WebSocket state if available, fallback to query data
  const update = updateState.updateAvailable ? updateState : initialUpdate;

  // Don't render if no update available
  if (!update || !update.updateAvailable) {
    return null;
  }

  const isDownloading = update.updateDownloading;
  const isDownloaded = update.updateDownloaded;

  // Determine icon based on state
  const icon = isDownloaded ? (
    <IconDeviceDesktopUp size={20} color="var(--mantine-color-green-6)" />
  ) : (
    <IconDownload size={20} color="var(--mantine-color-green-6)" />
  );

  // Determine label based on state
  const label = isDownloading ? (
    <Box className="postybirb__nav_item_label">
      <Text>{update.updateProgress?.toFixed(0)}%</Text>
    </Box>
  ) : isDownloaded ? (
    <Box className="postybirb__nav_item_label">
      <span>
        <Trans>Ready to Install</Trans>
      </span>
    </Box>
  ) : (
    <Box className="postybirb__nav_item_label">
      <span>
        <Trans>Update Available</Trans>
      </span>
    </Box>
  );

  const tooltipLabel = isDownloading ? (
    <Text>{update.updateProgress?.toFixed(0)}%</Text>
  ) : isDownloaded ? (
    <Trans>Update ready</Trans>
  ) : (
    <Trans>Update available</Trans>
  );

  const navLink = (
    <MantineNavLink
      label={collapsed ? undefined : label}
      leftSection={icon}
      active
      color="green"
      variant="light"
      onClick={modal.open}
    />
  );

  return (
    <>
      {collapsed ? (
        <Tooltip label={tooltipLabel} position="right" withArrow>
          {navLink}
        </Tooltip>
      ) : (
        navLink
      )}

      <UpdateModal
        opened={modalOpened}
        onClose={modal.close}
        updateState={update}
        onMockStartDownload={
          isDevelopment ? handleMockStartDownload : undefined
        }
      />
    </>
  );
}
