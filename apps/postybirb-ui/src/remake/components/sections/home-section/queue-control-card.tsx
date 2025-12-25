/**
 * QueueControlCard - Card for controlling the post queue (pause/resume).
 * Displays queue status and provides toggle functionality.
 */

import { Trans } from '@lingui/react/macro';
import {
  Badge,
  Button,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { IconPlayerPause, IconPlayerPlay, IconStack2 } from '@tabler/icons-react';
import { useState } from 'react';
import postQueueApi from '../../../api/post-queue.api';
import { useQueuePaused } from '../../../stores/settings-store';
import { useQueuedSubmissions } from '../../../stores/submission-store';

/**
 * QueueControlCard component for the home dashboard.
 * Shows queue status and allows pause/resume control.
 */
export function QueueControlCard() {
  const queuePaused = useQueuePaused();
  const queuedSubmissions = useQueuedSubmissions();
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
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <Group gap="xs">
            <ThemeIcon
              size="lg"
              variant="light"
              color={queuePaused ? 'orange' : 'green'}
              radius="md"
            >
              <IconStack2 size={20} />
            </ThemeIcon>
            <div>
              <Text size="sm" fw={500}>
                <Trans>Post Queue</Trans>
              </Text>
              <Text size="xs" c="dimmed">
                {queuedSubmissions.length}{' '}
                <Trans>item(s) queued</Trans>
              </Text>
            </div>
          </Group>
          <Badge
            color={queuePaused ? 'orange' : 'green'}
            variant="light"
            size="sm"
          >
            {queuePaused ? <Trans>Paused</Trans> : <Trans>Active</Trans>}
          </Badge>
        </Group>

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
          {queuePaused ? <Trans>Resume Posting</Trans> : <Trans>Pause Posting</Trans>}
        </Button>
      </Stack>
    </Paper>
  );
}
