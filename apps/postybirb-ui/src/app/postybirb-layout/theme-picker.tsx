import { useLingui } from '@lingui/react/macro';
import { ActionIcon, Tooltip, useMantineColorScheme } from '@mantine/core';
import {
  IconMoon,
  IconMoonFilled,
  IconSun,
  IconSunFilled,
} from '@tabler/icons-react';
import { useState } from 'react';
import './theme-picker.css';

export function ThemePicker() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [hovered, setHovered] = useState(false);
  const { t } = useLingui();

  const isDark = colorScheme === 'dark';
  const icon = isDark ? <IconMoon size={22} /> : <IconSun size={22} />;
  const hoverIcon = isDark ? (
    <IconMoonFilled size={22} />
  ) : (
    <IconSunFilled size={22} />
  );
  const tooltipLabel = isDark
    ? t`Switch to light mode`
    : t`Switch to dark mode`;

  const swapTheme = () => setColorScheme(isDark ? 'light' : 'dark');

  return (
    <Tooltip label={tooltipLabel} position="right" withArrow>
      <ActionIcon
        onClick={swapTheme}
        onMouseOver={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        variant="transparent"
        radius="md"
        className="theme-picker-button"
        size="lg"
        aria-label={tooltipLabel}
        c="inherit"
      >
        <div className="theme-icon-container">{hovered ? hoverIcon : icon}</div>
      </ActionIcon>
    </Tooltip>
  );
}
