import { Trans, useLingui } from '@lingui/react/macro';
import {
  Box,
  MultiSelect,
  Stack,
  Switch,
  TagsInput,
  Text,
  Title,
} from '@mantine/core';
import { useQuery } from 'react-query';
import settingsApi from '../../../../api/settings.api';
import { useLocale } from '../../../../hooks/use-locale';
import { languages } from '../../../../i18n/languages';

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
  const { locale } = useLocale();
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
    <Stack gap="lg">
      <Box>
        <Title order={4}>
          <Trans>Spellchecker Settings</Trans>
        </Title>
      </Box>

      <Stack gap="xs">
        <Switch
          label={<Trans>Enabled</Trans>}
          checked={enabled}
          onChange={(event) => {
            window.electron.setSpellCheckerEnabled(event.currentTarget.checked);
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
                allSpellcheckerLanguages.data?.includes(locale)
                  ? ['en', locale]
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
      </Stack>
    </Stack>
  );
}
