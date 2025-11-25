import { Trans } from '@lingui/react/macro';
import {
  Box,
  Button,
  Group,
  Paper,
  ThemeIcon,
  Title,
  Transition,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconPlayerPause,
  IconPlayerPlay,
  IconSettings,
} from '@tabler/icons-react';
import { useState } from 'react';
import postQueueApi from '../../../api/post-queue.api';
import settingsApi from '../../../api/settings.api';
import { useSettings } from '../../../stores/use-settings';

export function QueueControl() {
  const { settings, settingsId } = useSettings();
  const [isLoading, setIsLoading] = useState(false);
  const isPaused = settings?.queuePaused ?? false;

  const togglePause = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const { paused } = isPaused
        ? (await postQueueApi.resume()).body
        : (await postQueueApi.pause()).body;

      // Update settings
      if (settingsId) {
        await settingsApi.update(settingsId, {
          settings: { ...settings, queuePaused: paused },
        });
      }

      notifications.show({
        message: paused ? (
          <Trans>Submission processing has been paused</Trans>
        ) : (
          <Trans>Submission processing has been resumed</Trans>
        ),
        color: paused ? 'orange' : 'green',
      });
    } catch (error) {
      notifications.show({ message: (error as Error).message, color: 'red' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Paper
      withBorder
      p="xl"
      radius="xl"
      shadow="md"
      style={{
        borderColor: isPaused
          ? 'var(--mantine-color-orange-4)'
          : 'var(--mantine-color-teal-4)',
      }}
    >
      <Group justify="space-between" align="center">
        <Group>
          <ThemeIcon
            size="lg"
            radius="xl"
            variant="light"
            color={isPaused ? 'orange' : 'teal'}
          >
            <IconSettings size={20} />
          </ThemeIcon>
          <Box>
            <Title order={4}>
              <Trans>Queue Control</Trans>
            </Title>
          </Box>
        </Group>
        <Transition mounted transition="scale" duration={200}>
          {(styles) => (
            <Button
              leftSection={
                isPaused ? (
                  <IconPlayerPlay size={18} />
                ) : (
                  <IconPlayerPause size={18} />
                )
              }
              color={isPaused ? 'teal' : 'orange'}
              variant={isPaused ? 'filled' : 'light'}
              size="md"
              radius="xl"
              onClick={togglePause}
              loading={isLoading}
              style={styles}
            >
              {isPaused ? (
                <Trans>Resume Submissions</Trans>
              ) : (
                <Trans>Pause Submissions</Trans>
              )}
            </Button>
          )}
        </Transition>
      </Group>
    </Paper>
  );
}
