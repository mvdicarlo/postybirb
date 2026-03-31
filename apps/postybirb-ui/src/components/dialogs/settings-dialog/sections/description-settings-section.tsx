/**
 * Description Settings Section - Description-related preferences.
 */

import { Trans } from '@lingui/react/macro';
import { Box, Stack, Switch, Title } from '@mantine/core';
import settingsApi from '../../../../api/settings.api';
import { useSettings } from '../../../../stores';

export function DescriptionSettingsSection() {
  const settings = useSettings();

  if (!settings) return null;

  return (
    <Stack gap="lg">
      <Box>
        <Title order={4} mb="md">
          <Trans>Description Settings</Trans>
        </Title>

        <Switch
          label={
            <Trans>
              Allow PostyBirb to self-advertise at the end of descriptions
            </Trans>
          }
          checked={settings.allowAd}
          onChange={(event) => {
            settingsApi.update(settings.id, {
              settings: {
                ...settings.settings,
                allowAd: event.currentTarget.checked,
              },
            });
          }}
        />
      </Box>
    </Stack>
  );
}
