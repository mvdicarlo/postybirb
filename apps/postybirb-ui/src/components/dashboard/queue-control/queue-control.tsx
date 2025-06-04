import { Trans } from '@lingui/macro';
import { Button, Group, Paper, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlayerPause, IconPlayerPlay } from '@tabler/icons-react';
import postQueueApi from '../../../api/post-queue.api';
import settingsApi from '../../../api/settings.api';
import { useSettings } from '../../../stores/use-settings';

export function QueueControl() {
  const { settings, settingsId } = useSettings();
  const isPaused = settings?.queuePaused ?? false;

  const togglePause = async () => {
    try {
      const { paused } = isPaused
        ? await postQueueApi.resume()
        : await postQueueApi.pause();
      
      // Update settings
      if (settingsId) {
        await settingsApi.update(settingsId, {
          settings: {
            ...settings,
            queuePaused: paused
          }
        });
      }
      
      notifications.show({
        title: paused ? 
          <Trans>Queue Paused</Trans> : 
          <Trans>Queue Resumed</Trans>,
        message: paused ? 
          <Trans>Submission processing has been paused</Trans> : 
          <Trans>Submission processing has been resumed</Trans>,
        color: paused ? 'orange' : 'green',
      });
    } catch (error) {
      notifications.show({
        title: <Trans>Error</Trans>,
        message: error.message,
        color: 'red',
      });
    }
  };

  return (
    <Paper withBorder p="md" radius="md" shadow="sm">
      <Group position="apart">
        <Title order={4}>
          <Trans>Queue Control</Trans>
        </Title>
        <Button
          leftIcon={isPaused ? <IconPlayerPlay size={16} /> : <IconPlayerPause size={16} />}
          color={isPaused ? 'green' : 'orange'}
          onClick={togglePause}
        >
          {isPaused ? <Trans>Resume Submissions</Trans> : <Trans>Pause Submissions</Trans>}
        </Button>
      </Group>
    </Paper>
  );
}