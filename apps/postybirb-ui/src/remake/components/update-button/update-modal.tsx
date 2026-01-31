/**
 * UpdateModal - Modal for displaying update information and controlling the update process.
 * Shows version info, changelog, download progress, and action buttons.
 */

import { Trans } from '@lingui/react/macro';
import {
  Alert,
  Box,
  Button,
  Group,
  Modal,
  Progress,
  ScrollArea,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { UpdateState } from '@postybirb/types';
import { IconDeviceDesktopUp, IconDownload } from '@tabler/icons-react';
import updateApi from '../../api/update.api';

interface UpdateModalProps {
  /** Whether the modal is open */
  opened: boolean;
  /** Callback when the modal should close */
  onClose: () => void;
  /** Current update state */
  updateState: UpdateState;
  /** Optional callback for mock download in development mode */
  onMockStartDownload?: () => void;
}

/**
 * Modal component for managing app updates.
 * Displays release notes, download progress, and action buttons.
 */
export function UpdateModal({
  opened,
  onClose,
  updateState,
  onMockStartDownload,
}: UpdateModalProps) {
  const isDownloading = updateState.updateDownloading;
  const isDownloaded = updateState.updateDownloaded;
  const progress = updateState.updateProgress ?? 0;

  const handleStartUpdate = async () => {
    if (onMockStartDownload) {
      // Use mock handler in development mode
      onMockStartDownload();
    } else {
      await updateApi.startUpdate();
    }
  };

  const handleInstallUpdate = async () => {
    await updateApi.installUpdate();
  };

  // Get the latest version from release notes
  const latestVersion = updateState.updateNotes?.[0]?.version;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconDownload size={20} color="var(--mantine-color-green-6)" />
          <Title order={4}>
            <Trans>Update Available</Trans>
          </Title>
        </Group>
      }
      size="md"
      centered
    >
      <Stack gap="md">
        {/* Version info */}
        {latestVersion && (
          <Text size="sm" c="dimmed">
            <Trans>New version:</Trans>{' '}
            <Text span fw={600} c="green">
              {latestVersion}
            </Text>
          </Text>
        )}

        {/* Error alert */}
        {updateState.updateError && (
          <Alert color="red" title={<Trans>Update Error</Trans>}>
            {updateState.updateError}
          </Alert>
        )}

        {/* Download progress */}
        {isDownloading && (
          <Box>
            <Text size="sm" mb="xs">
              <Trans>Downloading update...</Trans> {progress.toFixed(0)}%
            </Text>
            <Progress value={progress} color="green" size="lg" animated />
          </Box>
        )}

        {/* Downloaded status */}
        {isDownloaded && (
          <Alert color="green" title={<Trans>Ready to Install</Trans>}>
            <Trans>
              The update has been downloaded and is ready to install. Click
              "Restart Now" to apply the update.
            </Trans>
          </Alert>
        )}

        {/* Release notes */}
        {updateState.updateNotes && updateState.updateNotes.length > 0 && (
          <Box>
            <Text size="sm" fw={600} mb="xs">
              <Trans>What's New</Trans>
            </Text>
            <ScrollArea.Autosize mah={250} offsetScrollbars>
              <Stack gap="sm">
                {updateState.updateNotes.map((note) => (
                  <Box
                    key={note.version}
                    p="xs"
                    style={{
                      backgroundColor: 'var(--mantine-color-dark-6)',
                      borderRadius: 'var(--mantine-radius-sm)',
                    }}
                  >
                    <Text fw={600} size="sm" c="green">
                      {note.version}
                    </Text>
                    {note.note && (
                      <Text
                        size="xs"
                        c="dimmed"
                        mt={4}
                        // eslint-disable-next-line react/no-danger
                        dangerouslySetInnerHTML={{ __html: note.note }}
                      />
                    )}
                  </Box>
                ))}
              </Stack>
            </ScrollArea.Autosize>
          </Box>
        )}

        {/* Action buttons */}
        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose}>
            <Trans>Later</Trans>
          </Button>
          {isDownloaded ? (
            <Button
              color="green"
              leftSection={<IconDeviceDesktopUp size={16} />}
              onClick={handleInstallUpdate}
            >
              <Trans>Restart Now</Trans>
            </Button>
          ) : (
            <Button
              color="green"
              leftSection={<IconDownload size={16} />}
              loading={isDownloading}
              onClick={handleStartUpdate}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <Trans>Downloading...</Trans>
              ) : (
                <Trans>Download Update</Trans>
              )}
            </Button>
          )}
        </Group>
      </Stack>
    </Modal>
  );
}
