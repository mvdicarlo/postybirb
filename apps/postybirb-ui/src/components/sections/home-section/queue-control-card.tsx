/**
 * QueueControlCard - Card for controlling the post queue (pause/resume).
 * Displays queue status and provides toggle functionality.
 */

import { Trans } from '@lingui/react/macro';
import { Button, Loader, Paper, Stack, Text } from '@mantine/core';
import { IconPlayerPause, IconPlayerPlay } from '@tabler/icons-react';
import { useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import postingApi from '../../../api/posting.api';

const postingPausedQueryKey = 'posting-paused';

/**
 * QueueControlCard component for the home dashboard.
 * Shows queue status and allows pause/resume control.
 */
export function QueueControlCard() {
  const [isLoading, setIsLoading] = useState(false);
  const [updateFailed, setUpdateFailed] = useState(false);
  const queryClient = useQueryClient();
  const {
    data: queuePaused,
    isLoading: isLoadingStatus,
    isError,
  } = useQuery(
    postingPausedQueryKey,
    async () => (await postingApi.isPaused()).body.paused,
    { refetchInterval: 1000, enabled: !isLoading },
  );

  const handleToggle = async () => {
    if (queuePaused === undefined) {
      return;
    }

    setIsLoading(true);
    setUpdateFailed(false);
    try {
      await queryClient.cancelQueries(postingPausedQueryKey);
      const response = queuePaused
        ? await postingApi.unpause()
        : await postingApi.pause();
      queryClient.setQueryData(postingPausedQueryKey, response.body.paused);
    } catch {
      setUpdateFailed(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Paper withBorder p="md" radius="md" h="100%" data-tour-id="home-queue-control">
      <Stack gap="sm" justify="center" h="100%">
        <Button
          variant="light"
          color={queuePaused ? 'green' : 'orange'}
          size="xs"
          leftSection={
            isLoading || isLoadingStatus ? (
              <Loader size={14} />
            ) : queuePaused ? (
              <IconPlayerPlay size={14} />
            ) : (
              <IconPlayerPause size={14} />
            )
          }
          onClick={handleToggle}
          disabled={isLoading || queuePaused === undefined || isError}
          fullWidth
        >
          {queuePaused ? (
            <Trans>Resume Posting</Trans>
          ) : (
            <Trans>Pause Posting</Trans>
          )}
        </Button>
        {isError && (
          <Text size="xs" c="red" role="alert">
            <Trans>Unable to load posting status.</Trans>
          </Text>
        )}
        {updateFailed && (
          <Text size="xs" c="red" role="alert">
            <Trans>Unable to update posting status.</Trans>
          </Text>
        )}
      </Stack>
    </Paper>
  );
}
