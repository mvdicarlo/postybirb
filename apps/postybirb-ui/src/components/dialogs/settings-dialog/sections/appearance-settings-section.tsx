/**
 * Appearance Settings Section - Theme, color, and regional customization.
 */

import { Trans, useLingui } from '@lingui/react/macro';
import {
  Box,
  ColorSwatch,
  Group,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
  useMantineTheme,
} from '@mantine/core';
import { IconMoon, IconSun, IconSunMoon } from '@tabler/icons-react';
import { useMemo } from 'react';
import { getWeekdays } from '../../../../hooks/locale-utils';
import { useLocale } from '../../../../hooks/use-locale';
import {
  type ColorScheme,
  MANTINE_COLORS,
  type MantinePrimaryColor,
  useAppearanceActions,
} from '../../../../stores/ui/appearance-store';
import { useLanguageActions } from '../../../../stores/ui/locale-store';

/**
 * Color scheme options for the segmented control.
 */
const COLOR_SCHEME_OPTIONS = [
  {
    value: 'light' as ColorScheme,
    label: (
      <Group gap={6} wrap="nowrap">
        <IconSun size={16} />
        <Text size="sm">
          <Trans>Light</Trans>
        </Text>
      </Group>
    ),
  },
  {
    value: 'dark' as ColorScheme,
    label: (
      <Group gap={6} wrap="nowrap">
        <IconMoon size={16} />
        <Text size="sm">
          <Trans>Dark</Trans>
        </Text>
      </Group>
    ),
  },
  {
    value: 'auto' as ColorScheme,
    label: (
      <Group gap={6} wrap="nowrap">
        <IconSunMoon size={16} />
        <Text size="sm">
          <Trans>Auto</Trans>
        </Text>
      </Group>
    ),
  },
];

/**
 * Capitalize first letter of a string.
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function AppearanceSettingsSection() {
  const theme = useMantineTheme();
  const { colorScheme, primaryColor, setColorScheme, setPrimaryColor } =
    useAppearanceActions();
  const { hourCycle, setHourCycle, startOfWeek, setStartOfWeek } =
    useLanguageActions();
  const locale = useLocale();

  const { t } = useLingui();

  const weekdayOptions = useMemo(() => {
    const weekdayNames = getWeekdays(locale.locale, 1, 'long');
    const defaultStartOfWeek = weekdayNames.find(
      (day) => day.value === String(locale.defaultStartOfWeek),
    )?.label;
    return [
      { value: 'system', label: t`System region (${defaultStartOfWeek})` },
      ...weekdayNames,
    ];
  }, [locale.defaultStartOfWeek, locale.locale, t]);

  const defaultLocaleHours = locale.defaultHourCycle.slice(1);
  const hourCycleOptions = useMemo(
    () => [
      {
        value: 'system',
        label: <Trans>System region ({defaultLocaleHours}h)</Trans>,
      },
      { value: 'h12', label: '12h' },
      { value: 'h24', label: '24h' },
    ],
    [defaultLocaleHours],
  );

  const handleStartOfWeekChange = (value: string | null) => {
    if (value === null) return;
    if (value === 'system') {
      setStartOfWeek('system');
    } else {
      setStartOfWeek(parseInt(value, 10));
    }
  };

  return (
    <Stack gap="xl">
      {/* Color Scheme Selection */}
      <Box>
        <SegmentedControl
          value={colorScheme}
          onChange={(value) => setColorScheme(value as ColorScheme)}
          data={COLOR_SCHEME_OPTIONS}
          fullWidth
        />
      </Box>

      {/* Primary Color Selection */}
      <Box>
        <Text size="sm" fw={500} mb="xs">
          <Trans>Primary color</Trans>
        </Text>
        <SimpleGrid cols={6} spacing="sm">
          {MANTINE_COLORS.map((color) => {
            const isSelected = primaryColor === color;
            // Get the color value from the theme (shade 6 is the default)
            const colorValue = theme.colors[color][6];

            return (
              <Tooltip key={color} label={capitalize(color)} withArrow>
                <Box
                  onClick={() => setPrimaryColor(color as MantinePrimaryColor)}
                  style={{
                    borderRadius: 4,
                    padding: 3,
                    /* eslint-disable-next-line lingui/no-unlocalized-strings */
                    border: isSelected ? `2px solid ${colorValue}` : undefined,
                  }}
                >
                  <ColorSwatch
                    color={colorValue}
                    style={{ cursor: 'pointer' }}
                    size={32}
                  />
                </Box>
              </Tooltip>
            );
          })}
        </SimpleGrid>
      </Box>

      {/* Hour Cycle Selection */}
      <Box>
        <Text size="sm" fw={500} mb="xs">
          <Trans>Hour cycle</Trans>
        </Text>
        <SegmentedControl
          value={hourCycle === 'locale' ? 'system' : hourCycle}
          onChange={(value) => setHourCycle(value as 'system' | 'h12' | 'h24')}
          data={hourCycleOptions}
          fullWidth
        />
      </Box>

      {/* Start of Week Selection */}
      <Box>
        <Text size="sm" fw={500} mb="xs">
          <Trans>Start of week</Trans>
        </Text>
        <Select
          value={
            typeof startOfWeek === 'number' ? String(startOfWeek) : 'system'
          }
          onChange={handleStartOfWeekChange}
          data={weekdayOptions}
          allowDeselect={false}
          maxDropdownHeight={360}
        />
      </Box>
    </Stack>
  );
}
