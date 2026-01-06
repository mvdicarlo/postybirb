/**
 * ExternalLink - Opens links in the system's default browser.
 * Handles both Electron and web environments.
 */

import { Anchor, Tooltip } from '@mantine/core';
import type { AnchorHTMLAttributes, PropsWithChildren } from 'react';
import { CopyToClipboard } from '../copy-to-clipboard';

/**
 * Opens a URL in the system's default browser.
 * In Electron, uses the IPC bridge. In web, opens a new tab.
 */
export function openLink(url?: string) {
  if (url) {
    if (window.electron?.openExternalLink) {
      window.electron.openExternalLink(url);
    } else {
      window.open(url, '_blank');
    }
  }
}

/**
 * An anchor component that opens links externally.
 * Includes a tooltip with the URL and a copy button.
 */
export function ExternalLink(
  props: PropsWithChildren<
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'target' | 'onClick'>
  >,
) {
  const { href } = props;
  return (
    <Tooltip label={href} position="top" withArrow>
      <span>
        <Anchor
          {...props}
          target="_blank"
          c="blue"
          inherit // Inherit parent styles
          onClickCapture={(event) => {
            event.preventDefault();
            event.stopPropagation();
            openLink(href);
          }}
        />
        <CopyToClipboard value={href} variant="icon" size="xs" color="blue" />
      </span>
    </Tooltip>
  );
}
