/**
 * ContentArea - Scrollable container for primary content.
 * Provides independent scrolling and optional loading state overlay.
 */

import { Box, LoadingOverlay } from '@mantine/core';
import '../../styles/layout.css';
import type { ContentAreaProps } from '../../types/navigation';

/**
 * Scrollable content area that fills available space below the content navbar.
 * Shows a loading overlay when the loading prop is true.
 */
export function ContentArea({ children, loading = false }: ContentAreaProps) {
  return (
    <Box className="postybirb__content_area" pos="relative">
      <LoadingOverlay
        visible={loading}
        zIndex={10}
        overlayProps={{ radius: 'sm', blur: 2 }}
      />
      {children}
    </Box>
  );
}
