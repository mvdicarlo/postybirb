/**
 * Settings Dialog - Modal dialog for application settings.
 * Uses a sidebar navigation pattern similar to Discord/Slack settings.
 */

import { Trans } from '@lingui/react/macro';
import {
    Box,
    CloseButton,
    Group,
    Modal,
    NavLink,
    ScrollArea,
    Stack,
    Text,
    Title,
} from '@mantine/core';
import {
    IconBell,
    IconDatabase,
    IconDeviceDesktop,
    IconFileDescription,
    IconPalette,
    IconRouter,
    IconTags,
} from '@tabler/icons-react';
import { useCallback, useState } from 'react';
import { useActiveDrawer, useDrawerActions } from '../../../stores';
import {
    AppearanceSettingsSection,
    AppSettingsSection,
    DescriptionSettingsSection,
    ImportSettingsSection,
    NotificationsSettingsSection,
    RemoteSettingsSection,
    TagsSettingsSection,
} from './sections';
import classes from './settings-dialog.module.css';

// ============================================================================
// Types
// ============================================================================

type SettingsSection =
  | 'appearance'
  | 'app'
  | 'description'
  | 'notifications'
  | 'remote'
  | 'tags'
  | 'import';

interface NavItem {
  id: SettingsSection;
  label: React.ReactNode;
  icon: React.ReactNode;
}

// ============================================================================
// Navigation Items
// ============================================================================

const NAV_ITEMS: NavItem[] = [
  {
    id: 'appearance',
    label: <Trans>Appearance</Trans>,
    icon: <IconPalette size={18} />,
  },
  {
    id: 'app',
    label: <Trans>App</Trans>,
    icon: <IconDeviceDesktop size={18} />,
  },
  {
    id: 'description',
    label: <Trans>Description</Trans>,
    icon: <IconFileDescription size={18} />,
  },
  {
    id: 'notifications',
    label: <Trans>Notifications</Trans>,
    icon: <IconBell size={18} />,
  },
  {
    id: 'remote',
    label: <Trans>Remote</Trans>,
    icon: <IconRouter size={18} />,
  },
  {
    id: 'tags',
    label: <Trans>Tags</Trans>,
    icon: <IconTags size={18} />,
  },
  {
    id: 'import',
    label: <Trans>Import</Trans>,
    icon: <IconDatabase size={18} />,
  },
];

// ============================================================================
// Main Settings Dialog Component
// ============================================================================

export function SettingsDialog() {
  const activeDrawer = useActiveDrawer();
  const { closeDrawer } = useDrawerActions();
  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance');

  const opened = activeDrawer === 'settings';

  const renderSection = useCallback(() => {
    switch (activeSection) {
      case 'appearance':
        return <AppearanceSettingsSection />;
      case 'app':
        return <AppSettingsSection />;
      case 'description':
        return <DescriptionSettingsSection />;
      case 'notifications':
        return <NotificationsSettingsSection />;
      case 'remote':
        return <RemoteSettingsSection />;
      case 'tags':
        return <TagsSettingsSection />;
      case 'import':
        return <ImportSettingsSection />;
      default:
        return null;
    }
  }, [activeSection]);

  return (
    <Modal
      opened={opened}
      onClose={closeDrawer}
      size="xl"
      padding={0}
      withCloseButton={false}
      classNames={{
        content: classes.modalContent,
        body: classes.modalBody,
      }}
    >
      <div className={classes.container}>
        {/* Sidebar Navigation */}
        <nav className={classes.sidebar}>
          <div className={classes.sidebarHeader}>
            <Title order={4}>
              <Trans>Settings</Trans>
            </Title>
          </div>
          <ScrollArea className={classes.sidebarNav}>
            <Stack gap={2}>
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.id}
                  label={item.label}
                  leftSection={item.icon}
                  active={activeSection === item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={classes.navLink}
                />
              ))}
            </Stack>
          </ScrollArea>
        </nav>

        {/* Content Area */}
        <div className={classes.content}>
          {/* Header */}
          <header className={classes.contentHeader}>
            <Group justify="space-between" align="center">
              <Group gap="xs">
                <Text c="dimmed">
                  <Trans>Settings</Trans>
                </Text>
                <Text c="dimmed">&gt;</Text>
                <Text fw={500}>
                  {NAV_ITEMS.find((item) => item.id === activeSection)?.label}
                </Text>
              </Group>
              <CloseButton onClick={closeDrawer} size="lg" />
            </Group>
          </header>

          {/* Scrollable Content */}
          <ScrollArea className={classes.contentBody}>
            <Box p="lg">{renderSection()}</Box>
          </ScrollArea>
        </div>
      </div>
    </Modal>
  );
}
