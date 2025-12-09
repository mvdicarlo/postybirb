/**
 * ExternalLink - Opens links in the system's default browser.
 * Handles both Electron and web environments.
 */

import { Trans } from '@lingui/react/macro';
import { ActionIcon, Anchor, CopyButton, Tooltip } from '@mantine/core';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import type { AnchorHTMLAttributes, PropsWithChildren } from 'react';

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
    <Tooltip label={href} position="top" withArrow zIndex={1000}>
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
        <CopyButton value={href ?? ''} timeout={2000}>
          {({ copied, copy }) => (
            <Tooltip
              label={copied ? <Trans>Copied!</Trans> : <Trans>Copy link</Trans>}
              withArrow
              position="right"
            >
              <ActionIcon
                style={{ verticalAlign: 'middle' }}
                color={copied ? 'teal' : 'blue'}
                variant="subtle"
                onClick={copy}
                size="xs"
              >
                {copied ? (
                  <IconCheck size=".75em" />
                ) : (
                  <IconCopy size=".75em" />
                )}
              </ActionIcon>
            </Tooltip>
          )}
        </CopyButton>
      </span>
    </Tooltip>
  );
}
