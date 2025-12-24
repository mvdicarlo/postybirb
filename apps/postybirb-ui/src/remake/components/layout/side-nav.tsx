/**
 * SideNav - Collapsible side navigation panel using Mantine NavLink.
 * Supports expanded and collapsed states with smooth transitions.
 * Handles view, drawer, and custom navigation items.
 */

import { Trans } from '@lingui/react/macro';
import {
  Box,
  Divider,
  Image,
  Kbd,
  NavLink as MantineNavLink,
  ScrollArea,
  Title,
  Tooltip,
} from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import {
  useActiveDrawer,
  useDrawerActions,
  useViewState,
  useViewStateActions,
} from '../../stores/ui-store';
import '../../styles/layout.css';
import type { NavigationItem, SideNavProps } from '../../types/navigation';
import { cn } from '../../utils/class-names';
import { LanguagePicker } from '../language-picker';
import { ThemePicker } from '../theme-picker';
import { UpdateButton } from '../update-button';

/**
 * Render a single navigation item based on its type.
 */
function NavItemRenderer({
  item,
  collapsed,
  isActive,
}: {
  item: Exclude<NavigationItem, { type: 'divider' }>;
  collapsed: boolean;
  isActive: boolean;
}) {
  const { toggleDrawer } = useDrawerActions();
  const { setViewState } = useViewStateActions();

  // Handle theme item separately using the ThemePicker component
  if (item.type === 'theme') {
    return (
      <Box key={item.id}>
        <ThemePicker collapsed={collapsed} kbd={item.kbd} />
      </Box>
    );
  }

  // Handle language item separately using the LanguagePicker component
  if (item.type === 'language') {
    return (
      <Box key={item.id}>
        <LanguagePicker collapsed={collapsed} kbd={item.kbd} />
      </Box>
    );
  }

  // Build the label with optional keyboard shortcut (only for non-theme items)
  const labelContent = collapsed ? undefined : (
    <Box className="postybirb__nav_item_label">
      <span>{item.label}</span>
      {item.kbd && <Kbd size="xs">{item.kbd}</Kbd>}
    </Box>
  );

  // Common NavLink props
  const commonProps = {
    label: labelContent,
    leftSection: item.icon,
    disabled: item.disabled,
  };

  let navLinkContent: React.ReactNode;

  if (item.type === 'view') {
    navLinkContent = (
      <MantineNavLink
        onClick={() => setViewState(item.viewState)}
        active={isActive}
        {...commonProps}
      />
    );
  } else if (item.type === 'link') {
    // Legacy link type - kept for backwards compatibility
    navLinkContent = (
      <MantineNavLink
        component="a"
        href={item.path}
        active={isActive}
        {...commonProps}
      />
    );
  } else if (item.type === 'drawer') {
    navLinkContent = (
      <MantineNavLink
        onClick={() => toggleDrawer(item.drawerKey)}
        active={isActive}
        {...commonProps}
      />
    );
  } else if (item.type === 'custom') {
    navLinkContent = <MantineNavLink onClick={item.onClick} {...commonProps} />;
  }

  if (collapsed) {
    return (
      <Tooltip
        key={item.id}
        label={
          <Box className="postybirb__tooltip_content">
            <span>{item.label}</span>
            {item.kbd && (
              <Kbd size="xs" className="postybirb__kbd_aligned">
                {item.kbd}
              </Kbd>
            )}
          </Box>
        }
        position="right"
        withArrow
      >
        {navLinkContent}
      </Tooltip>
    );
  }

  return <Box key={item.id}>{navLinkContent}</Box>;
}

/**
 * Collapsible side navigation component.
 * Shows icons + labels when expanded, icons only when collapsed.
 */
export function SideNav({ items, collapsed, onCollapsedChange }: SideNavProps) {
  const viewState = useViewState();
  const activeDrawer = useActiveDrawer();

  return (
    <Box
      className={cn(['postybirb__sidenav'], {
        'postybirb__sidenav--collapsed': collapsed,
      })}
    >
      {/* Header with app icon */}
      <Box className="postybirb__sidenav_header">
        {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
        <Image src="/app-icon.png" alt="PostyBirb" w={32} h={32} />
        {!collapsed && (
          // eslint-disable-next-line lingui/no-unlocalized-strings
          <Title order={4} className="postybirb__sidenav_title" ml="xs">
            PostyBirb
          </Title>
        )}
      </Box>

      {/* Navigation Items */}
      <ScrollArea
        className="postybirb__sidenav_scroll"
        type="hover"
        scrollbarSize={6}
      >
        <Box className="postybirb__sidenav_nav">
          {/* Collapse/Expand toggle as first nav item */}

          <MantineNavLink
            leftSection={
              collapsed ? (
                <IconChevronRight size={20} />
              ) : (
                <IconChevronLeft size={20} />
              )
            }
            onClick={() => onCollapsedChange(!collapsed)}
            aria-label={
              // eslint-disable-next-line lingui/no-unlocalized-strings
              collapsed ? 'Expand navigation' : 'Collapse navigation'
            }
          />

          {/* Update button - shows when update is available */}
          <UpdateButton collapsed={collapsed} />

          {items.map((item) => {
            // Handle divider
            if (item.type === 'divider') {
              return <Divider key={item.id} my="xs" />;
            }

            // Determine if item is active based on current viewState or active drawer
            const isActive =
              (item.type === 'view' &&
                item.viewState.type === viewState.type) ||
              (item.type === 'drawer' && item.drawerKey === activeDrawer);

            return (
              <NavItemRenderer
                key={item.id}
                item={item}
                collapsed={collapsed}
                isActive={isActive}
              />
            );
          })}
        </Box>
      </ScrollArea>
    </Box>
  );
}
