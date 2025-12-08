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
  Menu,
  NavLink as MantineNavLink,
  Text,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconCheck, IconLanguage, IconWorld } from '@tabler/icons-react';
import { useState } from 'react';
import { languages } from '../../i18n/languages';
import { useLanguageActions } from '../../stores/ui-store';
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
    <Box
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
      }}
    >
      <span>{currentLanguageName}</span>
      {kbd && <Kbd size="xs">{kbd}</Kbd>}
    </Box>
  );

  const navLinkContent = (
    <MantineNavLink
      label={labelContent}
      leftSection={<IconLanguage size={20} />}
      active={opened}
      style={{
        borderRadius: 'var(--mantine-radius-sm)',
      }}
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
              <Box>
                <Trans>Language</Trans>
                {kbd && (
                  <Kbd size="xs" ml="xs">
                    {kbd}
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
              className={`postybirb__language_picker_item ${
                isActive ? 'postybirb__language_picker_item--selected' : ''
              }`}
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
