import { Trans } from '@lingui/react/macro';
import { Alert, Button, HoverCard, Stack, Text, Title } from '@mantine/core';
import { IconDeviceDesktopUp, IconDownload } from '@tabler/icons-react';
import { useQuery, useQueryClient } from 'react-query';
import updateApi from '../../api/update.api';

export function PostyBirbUpdateButton() {
  const queryClient = useQueryClient();
  const { data: update } = useQuery(
    'update',
    () => updateApi.checkForUpdates().then((res) => res.body),
    {
      refetchInterval: 5 * 60_000, // Check every 5 minutes
    },
  );

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

  return (
    <>
      {update.updateProgress ? (
        <Text c="teal" size="s">
          {update.updateProgress?.toFixed(0)}%
        </Text>
      ) : null}
      <HoverCard position="left" withArrow width={400}>
        <HoverCard.Target>
          <Button
            loading={isDownloading}
            w="100%"
            radius={0}
            color="green"
            variant="subtle"
          >
            {isDownloaded ? <IconDeviceDesktopUp /> : <IconDownload />}
          </Button>
        </HoverCard.Target>
        <HoverCard.Dropdown>
          <Title order={4}>
            <Trans>Update PostyBirb</Trans>
          </Title>
          {update.updateError ? (
            <Alert color="red">{update.updateError}</Alert>
          ) : null}
          <Stack>
            {update.updateNotes?.map((note) => (
              <Text key={note.version}>
                <strong>{note.version}</strong>:
                <div
                  style={{ marginLeft: '16px' }}
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: note.note ?? '' }}
                />
              </Text>
            ))}
          </Stack>
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
                <Trans>
                  Downloading... {update.updateProgress?.toFixed(0)}%
                </Trans>
              ) : (
                <Trans>Download Update</Trans>
              )}
            </Button>
          )}
        </HoverCard.Dropdown>
      </HoverCard>
    </>
  );
}
