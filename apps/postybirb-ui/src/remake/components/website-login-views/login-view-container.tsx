import { Box, type BoxProps } from '@mantine/core';
import type { ReactNode } from 'react';

export interface LoginViewContainerProps extends BoxProps {
  children: ReactNode;
}

/**
 * A consistent container wrapper for all login view components.
 * Provides max-width constraint and horizontal centering
 * to ensure login forms don't stretch edge-to-edge in the content area.
 * Note: Padding is handled by the parent scrollable container.
 */
export function LoginViewContainer({
  children,
  ...boxProps
}: LoginViewContainerProps): JSX.Element {
  return (
    <Box maw={500} mx="auto" {...boxProps}>
      {children}
    </Box>
  );
}
