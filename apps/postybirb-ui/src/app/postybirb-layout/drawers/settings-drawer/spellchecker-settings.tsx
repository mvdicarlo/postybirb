import { Trans, useLingui } from '@lingui/react/macro';
import {
  Box,
  Card,
  Group,
  MultiSelect,
  Stack,
  Switch,
  TagsInput,
  Text,
} from '@mantine/core';
import { IconTags } from '@tabler/icons-react';
import { useQuery } from 'react-query';
import settingsApi from '../../../../api/settings.api';
import { use18n } from '../../../../hooks/use-i18n';
import { languages } from '../../../languages';

export function SpellcheckerSettings() {
  const allSpellcheckerLanguages = useQuery(
    'allSpellcheckerLanguages',
    () => window.electron.getAllSpellcheckerLanguages(),
    { cacheTime: 0 },
  );
  const spellcheckerLanguages = useQuery('spellcheckerLanguages', () =>
    window.electron.getSpellcheckerLanguages(),
  );
  const spellcheckerWords = useQuery(
    'spellcheckerWords',
    () => window.electron.getSpellcheckerWords(),
    { cacheTime: 0 },
  );
  const startupSettings = useQuery(
    'startup',
    () => settingsApi.getStartupOptions().then((res) => res.body),
    {
      cacheTime: 0,
    },
  );
  const [current] = use18n();
  const { t } = useLingui();

  if (
    startupSettings.isLoading ||
    spellcheckerLanguages.isLoading ||
    spellcheckerWords.isLoading
  )
    return null;

  const enabled = startupSettings.data?.spellchecker ?? true;
  const isOSX = window.electron.platform === 'darwin';

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Card.Section withBorder inheritPadding py="xs">
        <Group>
          <IconTags size={20} />
          <Text fw={500} size="lg">
            <Trans>Spellchecker Settings</Trans>
          </Text>
        </Group>
      </Card.Section>
      <Stack mt="md" gap="md">
        <Box>
          <Switch
            label={<Trans>Enabled</Trans>}
            checked={enabled}
            onChange={(event) => {
              window.electron.setSpellCheckerEnabled(
                event.currentTarget.checked,
              );
              settingsApi
                .updateSystemStartupSettings({
                  spellchecker: event.currentTarget.checked,
                })
                .finally(startupSettings.refetch);
            }}
          />
          {isOSX && (
            <Text fw={500} size="xs">
              <Trans>
                Spellchecker advanced configuration is controlled by system on
                MacOS.
              </Trans>
            </Text>
          )}
          <MultiSelect
            label={
              <Text size="sm" fw={500} mb="xs">
                <Trans>Languages to check</Trans>
              </Text>
            }
            data={allSpellcheckerLanguages.data
              ?.map((e) => {
                const translated = languages.find(
                  (language) => language[1] === e,
                )?.[0];
                return { label: translated ? t(translated) : e, value: e };
              })
              .sort((a, b) => {
                // Move translated language to top
                const aTranslated = allSpellcheckerLanguages.data.includes(
                  a.label,
                );
                const bTranslated = allSpellcheckerLanguages.data.includes(
                  b.label,
                );
                return aTranslated === bTranslated ? 0 : aTranslated ? 1 : -1;
              })}
            value={spellcheckerLanguages.data}
            searchable
            clearable
            onClear={() =>
              window.electron
                .setSpellcheckerLanguages(
                  allSpellcheckerLanguages.data?.includes(current)
                    ? ['en', current]
                    : ['en'],
                )
                .finally(() => spellcheckerLanguages.refetch())
            }
            onChange={(value) => {
              window.electron
                .setSpellcheckerLanguages(value)
                .finally(() => spellcheckerLanguages.refetch());
            }}
            disabled={!enabled || isOSX}
          />
          <TagsInput
            label={
              <Text size="sm" fw={500} mb="xs">
                <Trans>Custom words</Trans>
              </Text>
            }
            value={spellcheckerWords.data}
            clearable
            onClear={() => {
              window.electron
                .setSpellcheckerWords([])
                .finally(() => spellcheckerWords.refetch());
            }}
            onChange={(value) => {
              window.electron
                .setSpellcheckerWords(value)
                .finally(() => spellcheckerWords.refetch());
            }}
            disabled={!enabled || isOSX}
          />
        </Box>
      </Stack>
    </Card>
  );
}
