/**
 * ThemePicker - Theme toggle component for switching between light and dark mode.
 * Can be used in navigation or standalone contexts.
 */

import { Trans } from '@lingui/react/macro';
import { Box, Kbd, NavLink as MantineNavLink, Tooltip, useMantineColorScheme } from '@mantine/core';
import { IconMoon, IconSun } from '@tabler/icons-react';

interface ThemePickerProps {
  /** Whether to show in collapsed mode (icon only with tooltip) */
  collapsed?: boolean;
  /** Optional keyboard shortcut to display */
  kbd?: string;
}

/**
 * Renders a theme toggle as a NavLink-style component.
 * Shows sun icon in dark mode (to switch to light) and moon icon in light mode (to switch to dark).
 */
export function ThemePicker({ collapsed = false, kbd }: ThemePickerProps) {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  const themeIcon = isDark ? <IconSun size={20} /> : <IconMoon size={20} />;
  const themeLabel = collapsed ? undefined : (
    <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
      <span>{isDark ? <Trans>Light Mode</Trans> : <Trans>Dark Mode</Trans>}</span>
      {kbd && <Kbd size="xs">{kbd}</Kbd>}
    </Box>
  );

  const themeContent = (
    <MantineNavLink
      onClick={() => toggleColorScheme()}
      label={themeLabel}
      leftSection={themeIcon}
      style={{
        borderRadius: 'var(--mantine-radius-sm)',
      }}
    />
  );

  if (collapsed) {
    return (
      <Tooltip
        label={
          <Box>
            {isDark ? <Trans>Light Mode</Trans> : <Trans>Dark Mode</Trans>}
            {kbd && <Kbd size="xs" ml="xs">{kbd}</Kbd>}
          </Box>
        }
        position="right"
        withArrow
      >
        {themeContent}
      </Tooltip>
    );
  }

  return themeContent;
}
