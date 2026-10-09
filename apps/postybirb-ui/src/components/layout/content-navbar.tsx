/**
 * ContentNavbar - Navbar at top of content area with pagination controls.
 * Shows title, pagination, and optional action buttons.
 */

import { Box, Group, Pagination, Text } from '@mantine/core';
import '../../styles/layout.css';
import type { ContentNavbarProps } from '../../types/navigation';

/**
 * Content area navbar with optional pagination controls.
 * Layout: [Title] [Pagination (center)] [Actions (right)]
 */
export function ContentNavbar({ config, onPageChange }: ContentNavbarProps) {
  const { showPagination, pagination, title, actions } = config;

  // Hide pagination if there's only one page or less
  const shouldShowPagination =
    showPagination && pagination && pagination.totalPages > 1;

  return (
    <Box className="postybirb__content_navbar">
      {/* Left: Title */}
      <Box className="postybirb__content_navbar_title">
        {title && <Text fw={500}>{title}</Text>}
      </Box>

      {/* Center: Pagination */}
      <Box className="postybirb__content_navbar_center">
        {shouldShowPagination && pagination && (
          <Pagination
            total={pagination.totalPages}
            value={pagination.currentPage}
            onChange={onPageChange}
            size="sm"
          />
        )}
      </Box>

      {/* Right: Actions */}
      <Group className="postybirb__content_navbar_actions" gap="xs">
        {actions}
      </Group>
    </Box>
  );
}
