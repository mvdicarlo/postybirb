/**
 * SideNav - Collapsible side navigation panel using Mantine NavLink.
 * Supports expanded and collapsed states with smooth transitions.
 * Handles link, drawer, and custom navigation items.
 */

import { Trans } from '@lingui/react/macro';
import { Box, Divider, Image, Kbd, NavLink as MantineNavLink, Tooltip } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useDrawerActions } from '../../stores/ui-store';
import '../../styles/layout.css';
import type { NavigationItem, SideNavProps } from '../../types/navigation';

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
  // Build the label with optional keyboard shortcut
  const labelContent = collapsed ? undefined : (
    <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
      <span>{item.label}</span>
      {item.kbd && <Kbd size="xs">{item.kbd}</Kbd>}
    </Box>
  );

  // Common NavLink props
  const commonProps = {
    label: labelContent,
    leftSection: item.icon,
    disabled: item.disabled,
    style: {
      borderRadius: 'var(--mantine-radius-sm)',
    },
  };

  let navLinkContent: React.ReactNode;

  if (item.type === 'link') {
    navLinkContent = (
      <MantineNavLink
        component={NavLink}
        to={item.path}
        active={isActive}
        {...commonProps}
      />
    );
  } else if (item.type === 'drawer') {
    navLinkContent = (
      <MantineNavLink
        onClick={() => toggleDrawer(item.drawerKey)}
        {...commonProps}
      />
    );
  } else if (item.type === 'custom') {
    navLinkContent = (
      <MantineNavLink
        onClick={item.onClick}
        {...commonProps}
      />
    );
  }

  if (collapsed) {
    return (
      <Tooltip
        key={item.id}
        label={
          <Box>
            {item.label}
            {item.kbd && <Kbd size="xs" ml="xs">{item.kbd}</Kbd>}
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
export function SideNav({
  items,
  collapsed,
  onCollapsedChange,
}: SideNavProps) {
  const location = useLocation();

  return (
    <Box className={`postybirb_sidenav ${collapsed ? 'collapsed' : ''}`}>
      {/* Header with app icon */}
      <Box className="postybirb_sidenav-header">
        {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
        <Image src="/app-icon.png" alt="PostyBirb" w={32} h={32} />
      </Box>

      {/* Navigation Items */}
      <Box className="postybirb_sidenav-nav">
        {/* Collapse/Expand toggle as first nav item */}
        <Tooltip
          label={collapsed ? <Trans>Expand</Trans> : <Trans>Collapse</Trans>}
          position="right"
          withArrow
          disabled={!collapsed}
        >
          <MantineNavLink
            label={collapsed ? undefined : <Trans>Collapse</Trans>}
            leftSection={collapsed ? <IconChevronRight size={20} /> : <IconChevronLeft size={20} />}
            onClick={() => onCollapsedChange(!collapsed)}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            style={{
              borderRadius: 'var(--mantine-radius-sm)',
            }}
          />
        </Tooltip>

        {items.map((item) => {
          // Handle divider
          if (item.type === 'divider') {
            return <Divider key={item.id} my="xs" />;
          }

          // Determine if link item is active
          const isActive =
            item.type === 'link' &&
            (location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path)));

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
    </Box>
  );
}
