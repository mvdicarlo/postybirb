/**
 * ThemePicker - Theme toggle component for switching between light and dark mode.
 * Can be used in navigation or standalone contexts.
 */

import { Trans } from '@lingui/react/macro';
import { Box, Kbd, NavLink as MantineNavLink, Tooltip, useMantineColorScheme } from '@mantine/core';
import { IconMoon, IconSun } from '@tabler/icons-react';
import { useAppearanceActions } from '../../stores/ui/appearance-store';
import '../../styles/layout.css';

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
  const { colorScheme: mantineColorScheme } = useMantineColorScheme();
  const { setColorScheme } = useAppearanceActions();
  
  // Use Mantine's computed color scheme (handles 'auto' resolution)
  const isDark = mantineColorScheme === 'dark';

  const toggleTheme = () => {
    // Toggle between light and dark (explicit choice, not auto)
    setColorScheme(isDark ? 'light' : 'dark');
  };

  const themeIcon = isDark ? <IconSun size={20} /> : <IconMoon size={20} />;
  const themeLabel = collapsed ? undefined : (
    <Box className="postybirb__nav_item_label">
      <span>{isDark ? <Trans>Light Mode</Trans> : <Trans>Dark Mode</Trans>}</span>
      {kbd && <Kbd size="xs">{kbd}</Kbd>}
    </Box>
  );

  const themeContent = (
    <MantineNavLink
      onClick={toggleTheme}
      label={themeLabel}
      leftSection={themeIcon}
    />
  );

  if (collapsed) {
    return (
      <Tooltip
        label={
          <Box className="postybirb__tooltip_content">
            <span>{isDark ? <Trans>Light Mode</Trans> : <Trans>Dark Mode</Trans>}</span>
            {kbd && (
              <Kbd size="xs" className="postybirb__kbd_aligned">
                {kbd}
              </Kbd>
            )}
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
