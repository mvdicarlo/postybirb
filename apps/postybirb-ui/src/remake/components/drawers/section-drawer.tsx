/**
 * SectionDrawer - Custom drawer that slides out from the section panel area.
 * Uses Portal to render into .postybirb__content_split for proper positioning.
 * Includes overlay and keyboard accessibility.
 * Note: FocusTrap is intentionally omitted to avoid conflicts with Mantine's
 * internal focus management in components like Select/Combobox.
 */

import { Box, CloseButton, Portal, Title } from '@mantine/core';
import { useEffect, useRef, useState } from 'react';
import '../../styles/layout.css';
import { cn } from '../../utils/class-names';

export interface SectionDrawerProps {
  /** Whether the drawer is open */
  opened: boolean;
  /** Callback when the drawer should close */
  onClose: () => void;
  /** Drawer title */
  title: React.ReactNode;
  /** Drawer content */
  children: React.ReactNode;
  /** Optional custom width (default: 360px via CSS) */
  width?: number | string;
  /** Whether to close on Escape key (default: true) */
  closeOnEscape?: boolean;
  /** Whether to close on overlay click (default: true) */
  closeOnClickOutside?: boolean;
}

/**
 * Custom drawer component that slides from the left edge of the content area.
 * Must be rendered inside .postybirb__content_split for proper positioning.
 */
export function SectionDrawer({
  opened,
  onClose,
  title,
  children,
  width,
  closeOnEscape = true,
  closeOnClickOutside = true,
}: SectionDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  // Get portal target on mount
  useEffect(() => {
    const target = document.getElementById('postybirb-content-split');
    setPortalTarget(target);
  }, []);

  // Handle Escape key to close drawer
  useEffect(() => {
    if (!opened || !closeOnEscape) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [opened, closeOnEscape, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (opened) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
    return undefined;
  }, [opened]);

  const handleOverlayClick = () => {
    if (closeOnClickOutside) {
      onClose();
    }
  };

  const drawerStyle = width ? { width } : undefined;

  // Don't render until portal target is available
  if (!portalTarget) return null;

  return (
    <Portal target={portalTarget}>
      {/* Overlay */}
      <Box
        className={cn(
          ['postybirb__section_drawer_overlay'],
          { 'postybirb__section_drawer_overlay--visible': opened }
        )}
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <Box
        ref={drawerRef}
        className={cn(
          ['postybirb__section_drawer'],
          { 'postybirb__section_drawer--open': opened }
        )}
        style={drawerStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="section-drawer-title"
      >
        {/* Header */}
        <Box className="postybirb__section_drawer_header">
          <Title order={4} id="section-drawer-title">
            {title}
          </Title>
          <CloseButton
            onClick={onClose}
            // eslint-disable-next-line lingui/no-unlocalized-strings
            aria-label="Close drawer"
            size="md"
          />
        </Box>

        {/* Body - only render content when opened to avoid ref issues */}
        <Box className="postybirb__section_drawer_body">
          {opened && children}
        </Box>
      </Box>
    </Portal>
  );
}
