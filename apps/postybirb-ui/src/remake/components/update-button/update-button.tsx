/**
 * UpdateButton - Shows app update availability and handles the update process.
 * Displays in the side navigation when an update is available.
 */

import { Trans } from '@lingui/react/macro';
import {
  Alert,
  Box,
  Kbd,
  NavLink as MantineNavLink,
  Popover,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { IconDeviceDesktopUp, IconDownload } from '@tabler/icons-react';
import { useQuery } from 'react-query';
import updateApi from '../../api/update.api';

interface UpdateButtonProps {
  /** Whether the sidenav is collapsed */
  collapsed: boolean;
}

/**
 * Update button component that displays when an app update is available.
 * Shows update notes and progress in a popover.
 */
export function UpdateButton({ collapsed }: UpdateButtonProps) {
  const { data: update } = useQuery(
    'update',
    () => updateApi.checkForUpdates().then((res) => res.body),
    {
      refetchInterval: 60_000 * 30, // Check every 30 minutes
    },
  );

  // Don't render if no update available
  if (!update || !update.updateAvailable) {
    return null;
  }

  const isDownloading = update.updateDownloading;
  const isDownloaded = update.updateDownloaded;

  // Determine icon and label based on state
  const icon = isDownloaded ? (
    <IconDeviceDesktopUp size={20} color="var(--mantine-color-green-6)" />
  ) : (
    <IconDownload size={20} color="var(--mantine-color-green-6)" />
  );

  const label = isDownloading ? (
    <Box className="postybirb__nav_item_label">
      <span>
        <Trans>Downloading...</Trans> {update.updateProgress}%
      </span>
    </Box>
  ) : isDownloaded ? (
    <Box className="postybirb__nav_item_label">
      <span>
        <Trans>Restart to Update</Trans>
      </span>
      <Kbd size="xs">!</Kbd>
    </Box>
  ) : (
    <Box className="postybirb__nav_item_label">
      <span>
        <Trans>Update Available</Trans>
      </span>
    </Box>
  );

  const tooltipLabel = isDownloading ? (
    <Trans>Downloading update... {update.updateProgress}%</Trans>
  ) : isDownloaded ? (
    <Trans>Restart to apply update</Trans>
  ) : (
    <Trans>Update available</Trans>
  );

  const navContent = (
    <Popover position="right" withArrow width={400} disabled={collapsed}>
      <Popover.Target>
        <MantineNavLink
          label={collapsed ? undefined : label}
          leftSection={icon}
          active
          color="green"
          variant="light"
        />
      </Popover.Target>
      <Popover.Dropdown>
        <Title order={5} mb="sm">
          <Trans>Update PostyBirb</Trans>
        </Title>

        {update.updateError && (
          <Alert color="red" mb="sm">
            {update.updateError}
          </Alert>
        )}

        {update.updateNotes && update.updateNotes.length > 0 && (
          <Stack gap="xs">
            {update.updateNotes.map((note) => (
              <Box key={note.version}>
                <Text fw={600} size="sm">
                  {note.version}
                </Text>
                {note.note && (
                  <Text
                    size="xs"
                    c="dimmed"
                    style={{ marginLeft: 8 }}
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{ __html: note.note }}
                  />
                )}
              </Box>
            ))}
          </Stack>
        )}

        {isDownloaded && (
          <Text size="sm" c="green" mt="sm">
            <Trans>Update downloaded. Restart the app to apply.</Trans>
          </Text>
        )}
      </Popover.Dropdown>
    </Popover>
  );

  if (collapsed) {
    return (
      <Tooltip label={tooltipLabel} position="right" withArrow>
        {navContent}
      </Tooltip>
    );
  }

  return navContent;
}
