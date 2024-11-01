/* eslint-disable react/no-danger */
import { Trans } from '@lingui/macro';
import { Alert, Button, HoverCard, Stack, Text, Title } from '@mantine/core';
import { IconDeviceDesktopUp } from '@tabler/icons-react';
import { useQuery } from 'react-query';
import updateApi from '../../api/update.api';

export function PostyBirbUpdateButton() {
  const { data: update } = useQuery(
    'update',
    () => updateApi.checkForUpdates().then((res) => res.body),
    {
      refetchInterval: 60_000 * 30,
    },
  );

  if (!update || !update.updateAvailable) {
    return null;
  }

  return (
    <>
      {update.updateProgress ? (
        <Text color="teal" size="s">
          {update.updateProgress}%
        </Text>
      ) : null}
      <HoverCard position="left" withArrow width={400}>
        <HoverCard.Target>
          <Button
            loading={update?.updateDownloading}
            w="100%"
            radius={0}
            color="green"
            variant="subtle"
          >
            <IconDeviceDesktopUp />
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
                  dangerouslySetInnerHTML={{ __html: note.note ?? '' }}
                />
              </Text>
            ))}
          </Stack>
        </HoverCard.Dropdown>
      </HoverCard>
    </>
  );
}
