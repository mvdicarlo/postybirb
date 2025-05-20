import { Trans } from '@lingui/macro';
import { Button, Group, Paper, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlayerPause, IconPlayerPlay } from '@tabler/icons-react';
import { useEffect } from 'react';
import postQueueApi from '../../../api/post-queue.api';
import { useQueueState } from '../../../stores/queue-state.store';

export function QueueControl() {
  const { isPaused, setIsPaused } = useQueueState();

  // Load initial pause state
  useEffect(() => {
    postQueueApi.isPaused().then(({ paused }) => {
      setIsPaused(paused);
    });
  }, [setIsPaused]);

  const togglePause = async () => {
    try {
      const { paused } = isPaused
        ? await postQueueApi.resume()
        : await postQueueApi.pause();
        
      setIsPaused(paused);
      
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