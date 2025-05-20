import { Trans } from '@lingui/macro';
import { Button, Group, Paper, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlayerPause, IconPlayerPlay } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import postQueueApi from '../../../api/post-queue.api';
import settingsApi from '../../../api/settings.api';
import { SettingsStore } from '../../../stores/settings.store';

export function QueueControl() {
  const [isPaused, setIsPaused] = useState(false);

  // Load settings and sync with pause state
  useEffect(() => {
    const subscription = SettingsStore.updates.subscribe(({ data }) => {
      if (data && data.length > 0) {
        setIsPaused(data[0].settings.queuePaused);
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);

  // Ensure UI state matches backend state
  useEffect(() => {
    postQueueApi.isPaused().then(({ paused }) => {
      setIsPaused(paused);
    });
  }, []);

  const togglePause = async () => {
    try {
      const { paused } = isPaused
        ? await postQueueApi.resume()
        : await postQueueApi.pause();
        
      setIsPaused(paused);
      
      // Update settings
      if (SettingsStore.getData().data.length > 0) {
        const settings = SettingsStore.getData().data[0];
        await settingsApi.update(settings.id, {
          settings: {
            ...settings.settings,
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