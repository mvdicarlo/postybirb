import { Trans } from "@lingui/react/macro";
import {
    Card,
    Group,
    Stack,
    Switch,
    Text,
} from '@mantine/core';
import { IconFileDescription } from '@tabler/icons-react';
import settingsApi from '../../../../api/settings.api';
import { useSettings } from '../../../../stores/use-settings';

export function DescriptionSettings() {
  const { settingsId, settings } = useSettings();

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Card.Section withBorder inheritPadding py="xs">
        <Group>
          <IconFileDescription size={20} />
          <Text fw={500} size="lg">
            <Trans>Description Settings</Trans>
          </Text>
        </Group>
      </Card.Section>

      <Stack mt="md" gap="md">
        <Switch
          label={
            <Group gap="xs">
              <Text>
                <Trans>
                  Allow PostyBirb to insert an Ad into the description
                </Trans>
              </Text>
            </Group>
          }
          checked={settings?.allowAd ?? true}
          onChange={(event) => {
            settingsApi.update(settingsId, {
              settings: {
                ...settings,
                allowAd: event.currentTarget.checked,
              },
            });
          }}
        />
      </Stack>
    </Card>
  );
}
