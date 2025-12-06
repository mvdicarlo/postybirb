/**
 * SubNavBar - Horizontal contextual navigation bar with scroll support.
 * Content changes based on the current route/section.
 */

import { Box, Button, Group, ScrollArea } from '@mantine/core';
import { NavLink } from 'react-router-dom';
import '../../styles/layout.css';
import type { SubNavBarProps } from '../../types/navigation';

/**
 * Horizontal sub-navigation bar that displays contextual items.
 * Hidden when config.visible is false.
 */
export function SubNavBar({ config }: SubNavBarProps) {
  if (!config.visible || config.items.length === 0) {
    return null;
  }

  return (
    <Box className="postybirb_subnav">
      <ScrollArea type="auto" offsetScrollbars scrollbarSize={6}>
        <Group gap="xs" wrap="nowrap">
          {config.items.map((item) => {
            const buttonContent = (
              <Button
                key={item.id}
                variant={item.active ? 'filled' : 'subtle'}
                size="compact-sm"
                disabled={item.disabled}
                onClick={item.onClick}
                leftSection={item.icon ? <item.icon size={16} /> : undefined}
              >
                {item.label}
              </Button>
            );

            // If item has a path, wrap in NavLink
            if (item.path && !item.onClick) {
              return (
                <NavLink key={item.id} to={item.path} style={{ textDecoration: 'none' }}>
                  {buttonContent}
                </NavLink>
              );
            }

            return buttonContent;
          })}
        </Group>
      </ScrollArea>
    </Box>
  );
}
