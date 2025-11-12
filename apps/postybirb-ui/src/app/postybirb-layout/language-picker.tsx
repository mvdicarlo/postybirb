import { Trans, useLingui } from '@lingui/react/macro';
import {
  ActionIcon,
  Badge,
  Box,
  Group,
  Menu,
  Text,
  Tooltip,
} from '@mantine/core';
import { useDisclosure, useHover } from '@mantine/hooks';
import {
  IconCheck,
  IconLanguageHiragana,
  IconWorld,
} from '@tabler/icons-react';
import { useState } from 'react';
import { use18n } from '../../hooks/use-i18n';
import { languages } from '../languages';
import './language-picker.css';

export function LanguagePicker() {
  const { t } = useLingui();
  const [locale, setLocale] = use18n();
  const [opened, { toggle, close }] = useDisclosure(false);
  const { hovered, ref } = useHover();
  const [hoveredLang, setHoveredLang] = useState<string | null>(null);

  return (
    <Box>
      <Menu
        opened={opened}
        onOpen={toggle}
        onClose={close}
        width={220}
        position="right-end"
        withArrow
        shadow="md"
        offset={8}
      >
        <Menu.Target>
          <Tooltip
            label={t`Change language`}
            position="right"
            withArrow
            openDelay={500}
          >
            <ActionIcon
              ref={ref}
              variant={hovered || opened ? 'light' : 'subtle'}
              radius="md"
              size="lg"
              aria-label={t`Change language`}
              c="inherit"
            >
              <IconLanguageHiragana
                className="postybirb-language-icon"
                size={28}
                stroke={1.5}
              />
            </ActionIcon>
          </Tooltip>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Label>
            <Group className="postybirb-language-header">
              <Text size="sm" fw={500}>
                <Trans>Select language</Trans>
              </Text>
              <Badge
                size="xs"
                variant="filled"
                color="blue"
                className="postybirb-language-badge"
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
                className={`postybirb-language-menu-item ${
                  isActive ? 'postybirb-language-selected-item' : ''
                }`}
                leftSection={
                  isActive ? <IconCheck size={16} /> : <IconWorld size={16} />
                }
                rightSection={
                  <Text className="postybirb-language-code">{value}</Text>
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
    </Box>
  );
}
