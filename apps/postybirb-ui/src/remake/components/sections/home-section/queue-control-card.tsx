/**
 * QueueControlCard - Card for controlling the post queue (pause/resume).
 * Displays queue status and provides toggle functionality.
 */

import { Trans } from '@lingui/react/macro';
import { Button, Loader, Paper, Stack } from '@mantine/core';
import { IconPlayerPause, IconPlayerPlay } from '@tabler/icons-react';
import { useState } from 'react';
import postQueueApi from '../../../api/post-queue.api';
import { useQueuePaused } from '../../../stores/settings-store';

/**
 * QueueControlCard component for the home dashboard.
 * Shows queue status and allows pause/resume control.
 */
export function QueueControlCard() {
  const queuePaused = useQueuePaused();
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      if (queuePaused) {
        await postQueueApi.resume();
      } else {
        await postQueueApi.pause();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Paper withBorder p="md" radius="md" h="100%">
      <Stack gap="sm" justify="center" h="100%">
        <Button
          variant="light"
          color={queuePaused ? 'green' : 'orange'}
          size="xs"
          leftSection={
            isLoading ? (
              <Loader size={14} />
            ) : queuePaused ? (
              <IconPlayerPlay size={14} />
            ) : (
              <IconPlayerPause size={14} />
            )
          }
          onClick={handleToggle}
          disabled={isLoading}
          fullWidth
        >
          {queuePaused ? (
            <Trans>Resume Posting</Trans>
          ) : (
            <Trans>Pause Posting</Trans>
          )}
        </Button>
      </Stack>
    </Paper>
  );
}
