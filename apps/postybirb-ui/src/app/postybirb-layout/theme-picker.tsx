import { UnstyledButton, useMantineColorScheme } from '@mantine/core';
import {
  IconMoon,
  IconMoonFilled,
  IconSun,
  IconSunFilled,
} from '@tabler/icons-react';
import { useState } from 'react';

export function ThemePicker() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [hovered, setHovered] = useState(false);

  const icon =
    colorScheme === 'dark' ? <IconMoon height={30} /> : <IconSun height={30} />;
  const hoverIcon =
    colorScheme === 'dark' ? (
      <IconMoonFilled height={30} />
    ) : (
      <IconSunFilled height={30} />
    );
  const swapTheme = () =>
    setColorScheme(colorScheme === 'dark' ? 'light' : 'dark');

  return (
    <div>
      <UnstyledButton
        onClick={swapTheme}
        onMouseOver={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {hovered ? hoverIcon : icon}
      </UnstyledButton>
    </div>
  );
}
