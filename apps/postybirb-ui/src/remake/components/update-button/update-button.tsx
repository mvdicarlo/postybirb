/**
 * UpdateButton - Shows app update availability and handles the update process.
 * Displays in the side navigation when an update is available.
 */

import { Trans } from '@lingui/react/macro';
import {
  Alert,
  Box,
  Button,
  NavLink as MantineNavLink,
  Popover,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { IconDeviceDesktopUp, IconDownload } from '@tabler/icons-react';
import { useQuery, useQueryClient } from 'react-query';
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
  const queryClient = useQueryClient();
  const { data: update } = useQuery(
    'update',
    () => updateApi.checkForUpdates().then((res) => res.body),
    {
      refetchInterval: 5 * 60_000, // Check every 5 minutes
    },
  );

  // Don't render if no update available
  if (!update || !update.updateAvailable) {
    return null;
  }

  const isDownloading = update.updateDownloading;
  const isDownloaded = update.updateDownloaded;

  const handleStartUpdate = async () => {
    await updateApi.startUpdate();
    // Refetch to get the downloading state
    queryClient.invalidateQueries('update');
  };

  // Determine icon and label based on state
  const icon = isDownloaded ? (
    <IconDeviceDesktopUp size={20} color="var(--mantine-color-green-6)" />
  ) : (
    <IconDownload size={20} color="var(--mantine-color-green-6)" />
  );

  const label = isDownloading ? (
    <Box className="postybirb__nav_item_label">
      <span>
        <Trans>Downloading...</Trans> {update.updateProgress?.toFixed(0)}%
      </span>
    </Box>
  ) : isDownloaded ? (
    <Box className="postybirb__nav_item_label">
      <span>
        <Trans>Restarting...</Trans>
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
    <Trans>Downloading update... {update.updateProgress?.toFixed(0)}%</Trans>
  ) : isDownloaded ? (
    <Trans>Restarting to apply update...</Trans>
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

        {isDownloaded ? (
          <Text size="sm" c="green" mt="sm">
            <Trans>Restarting to apply update...</Trans>
          </Text>
        ) : (
          <Button
            mt="sm"
            fullWidth
            color="green"
            leftSection={<IconDownload size={16} />}
            loading={isDownloading}
            onClick={handleStartUpdate}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <Trans>Downloading... {update.updateProgress?.toFixed(0)}%</Trans>
            ) : (
              <Trans>Download Update</Trans>
            )}
          </Button>
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
