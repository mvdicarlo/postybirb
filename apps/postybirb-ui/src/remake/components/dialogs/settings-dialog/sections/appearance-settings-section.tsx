/**
 * Appearance Settings Section - Theme and color customization.
 */

import { Trans } from '@lingui/react/macro';
import {
  Box,
  ColorSwatch,
  Group,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
  useMantineTheme,
} from '@mantine/core';
import { IconMoon, IconSun, IconSunMoon } from '@tabler/icons-react';
import {
  type ColorScheme,
  MANTINE_COLORS,
  type MantinePrimaryColor,
  useAppearanceActions,
} from '../../../../stores/appearance-store';

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
        <SimpleGrid cols={6} spacing="sm">
          {MANTINE_COLORS.map((color) => {
            const isSelected = primaryColor === color;
            // Get the color value from the theme (shade 6 is the default)
            const colorValue = theme.colors[color][6];

            return (
              <Tooltip
                key={color}
                label={capitalize(color)}
                withArrow
                zIndex={1000}
              >
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
    </Stack>
  );
}
