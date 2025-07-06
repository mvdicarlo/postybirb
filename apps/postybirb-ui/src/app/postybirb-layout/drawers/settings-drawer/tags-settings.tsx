import { msg, Trans } from '@lingui/macro';
import { Box, Card, Group, Select, Stack, Switch, Text } from '@mantine/core';
import { IconTags } from '@tabler/icons-react';
import settingsApi from '../../../../api/settings.api';
import { TagSearchProviders } from '../../../../components/form/fields/tag-search/tag-search-providers';
import { useTrans } from '../../../../hooks/use-trans';
import { useSettings } from '../../../../stores/use-settings';

export function TagsSettings() {
  const { settingsId, settings } = useSettings();
  const i18n = useTrans();

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Card.Section withBorder inheritPadding py="xs">
        <Group>
          <IconTags size={20} />
          <Text fw={500} size="lg">
            <Trans>Tags Settings</Trans>
          </Text>
        </Group>
      </Card.Section>
      <Stack mt="md" gap="md">
        <Box>
          <Select
            label={
              <Text size="sm" fw={500} mb="xs">
                <Trans>Global tag search provider</Trans>
              </Text>
            }
            data={[
              { label: i18n(msg`None`), value: '' },
              ...Object.keys(TagSearchProviders),
            ]}
            value={settings?.tagSearchProvider.id ?? ''}
            onChange={(value) => {
              settingsApi.update(settingsId, {
                settings: {
                  ...settings,
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
              Sites like e621 provide tag autocomplete feature which you can use
              outside of their tag search field.
            </Trans>
          </Text>
        </Box>

        <Box>
          <Switch
            label={
              <Text size="sm" fw={500} mb="xs">
                <Trans>Show wiki page related to tag on hover</Trans>
              </Text>
            }
            checked={settings?.tagSearchProvider.showWikiInHelpOnHover ?? true}
            onChange={(event) => {
              settingsApi.update(settingsId, {
                settings: {
                  ...settings,
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
    </Card>
  );
}
