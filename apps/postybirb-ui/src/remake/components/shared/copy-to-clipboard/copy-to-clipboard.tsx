/**
 * CopyToClipboard - Reusable copy to clipboard component.
 * Supports icon-only (ActionIcon) and button (with label) variants.
 */

import { Trans } from '@lingui/react/macro';
import { ActionIcon, Button, CopyButton, Tooltip } from '@mantine/core';
import { IconCheck, IconCopy } from '@tabler/icons-react';

export interface CopyToClipboardProps {
  /** The value to copy to clipboard */
  value: string | undefined;
  /** Variant: 'icon' for ActionIcon, 'button' for Button with label */
  variant?: 'icon' | 'button';
  /** Size of the component */
  size?: 'xs' | 'sm' | 'md';
  /** Color when not copied (default: 'gray' for icon, 'blue' for button) */
  color?: string;
  /** Timeout in ms before resetting copied state (default: 2000) */
  timeout?: number;
  /** Tooltip position (for icon variant) */
  tooltipPosition?: 'top' | 'right' | 'bottom' | 'left';
}

/**
 * Copy to clipboard component with icon or button variant.
 */
export function CopyToClipboard({
  value,
  variant = 'icon',
  size = 'sm',
  color,
  timeout = 2000,
  tooltipPosition = 'right',
}: CopyToClipboardProps) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const defaultColor = variant === 'icon' ? 'gray' : 'blue';
  const baseColor = color ?? defaultColor;

  return (
    <CopyButton value={value.trim()} timeout={timeout}>
      {({ copied, copy }) => {
        if (variant === 'button') {
          return (
            <Button
              color={copied ? 'teal' : baseColor}
              onClick={copy}
              leftSection={<IconCopy size={size === 'xs' ? 12 : 16} />}
              size={size}
              variant="subtle"
            >
              {copied ? <Trans>Copied</Trans> : <Trans>Copy</Trans>}
            </Button>
          );
        }

        // Icon variant
        return (
          <Tooltip label={<Trans>Copy</Trans>} withArrow position={tooltipPosition}>
            <ActionIcon
              color={copied ? 'teal' : baseColor}
              variant="subtle"
              onClick={copy}
              size={size}
            >
              {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
            </ActionIcon>
          </Tooltip>
        );
      }}
    </CopyButton>
  );
}
