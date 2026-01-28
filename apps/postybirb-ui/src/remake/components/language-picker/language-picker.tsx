/**
 * LanguagePicker - Language selection component for switching app locale.
 * Displays as a NavLink-style component with a menu popup for language selection.
 */

import { Trans, useLingui } from '@lingui/react/macro';
import {
    Badge,
    Box,
    Group,
    Kbd,
    NavLink as MantineNavLink,
    Menu,
    Text,
    Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconCheck, IconLanguage, IconWorld } from '@tabler/icons-react';
import { useState } from 'react';
import { formatKeybindingDisplay } from '../../../shared/platform-utils';
import { languages } from '../../i18n/languages';
import { useLanguageActions } from '../../stores/ui/locale-store';
import '../../styles/layout.css';
import { cn } from '../../utils/class-names';
import './language-picker.css';

interface LanguagePickerProps {
  /** Whether to show in collapsed mode (icon only with tooltip) */
  collapsed?: boolean;
  /** Optional keyboard shortcut to display */
  kbd?: string;
}

/**
 * Renders a language picker as a NavLink-style component with a popup menu.
 */
export function LanguagePicker({ collapsed = false, kbd }: LanguagePickerProps) {
  const { t } = useLingui();
  const { language: locale, setLanguage: setLocale } = useLanguageActions();
  const [opened, { toggle, close }] = useDisclosure(false);
  const [hoveredLang, setHoveredLang] = useState<string | null>(null);

  // Get current language display name
  const currentLanguage = languages.find(([, code]) => code === locale);
  const currentLanguageName = currentLanguage ? t(currentLanguage[0]) : locale;

  const labelContent = collapsed ? undefined : (
    <Box className="postybirb__nav_item_label">
      <span>{currentLanguageName}</span>
      {kbd && <Kbd size="xs">{formatKeybindingDisplay(kbd)}</Kbd>}
    </Box>
  );

  const navLinkContent = (
    <MantineNavLink
      label={labelContent}
      leftSection={<IconLanguage size={20} />}
      active={opened}
    />
  );

  const menuContent = (
    <Menu
      opened={opened}
      onOpen={toggle}
      onClose={close}
      width={220}
      position="right-start"
      withArrow
      shadow="md"
      offset={8}
    >
      <Menu.Target>
        {collapsed ? (
          <Tooltip
            label={
              <Box className="postybirb__tooltip_content">
                <span><Trans>Language</Trans></span>
                {kbd && (
                  <Kbd size="xs" className="postybirb__kbd_aligned">
                    {formatKeybindingDisplay(kbd)}
                  </Kbd>
                )}
              </Box>
            }
            position="right"
            withArrow
          >
            {navLinkContent}
          </Tooltip>
        ) : (
          navLinkContent
        )}
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>
          <Group className="postybirb__language_picker_header">
            <Text size="sm" fw={500}>
              <Trans>Select language</Trans>
            </Text>
            <Badge
              size="xs"
              variant="filled"
              color="blue"
              className="postybirb__language_picker_badge"
            >
              {locale}
            </Badge>
          </Group>
        </Menu.Label>

        {languages.map(([label, value]) => {
          const isActive = value === locale;
          const isHovered = value === hoveredLang;

          return (
            <Menu.Item
              key={value}
              className={cn(['postybirb__language_picker_item'], {
                'postybirb__language_picker_item--selected': isActive,
              })}
              leftSection={
                isActive ? <IconCheck size={16} /> : <IconWorld size={16} />
              }
              rightSection={
                <Text className="postybirb__language_picker_code">{value}</Text>
              }
              onClick={() => {
                setLocale(value);
                close();
              }}
              onMouseEnter={() => setHoveredLang(value)}
              onMouseLeave={() => setHoveredLang(null)}
              color={isActive || isHovered ? 'blue' : undefined}
              fw={isActive ? 500 : undefined}
            >
              {t(label)}
            </Menu.Item>
          );
        })}
      </Menu.Dropdown>
    </Menu>
  );

  return <Box>{menuContent}</Box>;
}
