/**
 * Tags Settings Section - Tag search provider settings.
 */

import { Trans, useLingui } from '@lingui/react/macro';
import { Box, Select, Stack, Switch, Text, Title } from '@mantine/core';
import settingsApi from '../../../../api/settings.api';
import { useSettings } from '../../../../stores';

export function TagsSettingsSection() {
  const { t } = useLingui();
  const settings = useSettings();

  if (!settings) return null;

  // Simple provider list - you may want to import this from elsewhere
  const tagProviders = [
    { label: t`None`, value: '' },
    // eslint-disable-next-line lingui/no-unlocalized-strings
    { label: 'e621', value: 'e621' },
    // eslint-disable-next-line lingui/no-unlocalized-strings
    { label: 'Danbooru', value: 'danbooru' },
  ];

  return (
    <Stack gap="lg">
      <Box>
        <Title order={4} mb="md">
          <Trans>Tags Settings</Trans>
        </Title>

        <Stack gap="md">
          <Box>
            <Select
              label={<Trans>Global tag search provider</Trans>}
              data={tagProviders}
              value={settings.tagSearchProvider?.id ?? ''}
              onChange={(value) => {
                settingsApi.update(settings.id, {
                  settings: {
                    ...settings.settings,
                    tagSearchProvider: {
                      ...settings.tagSearchProvider,
                      id: value ?? '',
                    },
                  },
                });
              }}
            />
            <Text size="xs" c="dimmed" mt={5}>
              <Trans>
                Sites like e621 provide tag autocomplete feature which you can
                use outside of their tag search field.
              </Trans>
            </Text>
          </Box>

          <Box>
            <Switch
              label={<Trans>Show wiki page related to tag on hover</Trans>}
              checked={settings.tagSearchProvider?.showWikiInHelpOnHover ?? true}
              onChange={(event) => {
                settingsApi.update(settings.id, {
                  settings: {
                    ...settings.settings,
                    tagSearchProvider: {
                      ...settings.tagSearchProvider,
                      showWikiInHelpOnHover: event.currentTarget.checked,
                    },
                  },
                });
              }}
            />
            <Text size="xs" c="dimmed" mt={5}>
              <Trans>Not all tag providers support this feature.</Trans>
            </Text>
          </Box>
        </Stack>
      </Box>
    </Stack>
  );
}
