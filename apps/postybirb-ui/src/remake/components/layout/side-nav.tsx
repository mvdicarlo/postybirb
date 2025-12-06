/**
 * SideNav - Collapsible side navigation panel using Mantine NavLink.
 * Supports expanded and collapsed states with smooth transitions.
 */

import { Trans } from '@lingui/macro';
import { Box, Image, NavLink as MantineNavLink, Tooltip } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { NavLink, useLocation } from 'react-router-dom';
import '../../styles/layout.css';
import type { SideNavProps } from '../../types/navigation';

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
            style={{
              borderRadius: 'var(--mantine-radius-sm)',
            }}
          />
        </Tooltip>

        {items.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));
          const Icon = item.icon;

          const navLinkContent = (
            <MantineNavLink
              component={NavLink}
              to={item.path}
              label={collapsed ? undefined : item.label}
              leftSection={<Icon size={20} />}
              active={isActive}
              disabled={item.disabled}
              style={{
                borderRadius: 'var(--mantine-radius-sm)',
              }}
            />
          );

          if (collapsed) {
            return (
              <Tooltip
                key={item.id}
                label={item.label}
                position="right"
                withArrow
              >
                {navLinkContent}
              </Tooltip>
            );
          }

          return (
            <Box key={item.id}>
              {navLinkContent}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
