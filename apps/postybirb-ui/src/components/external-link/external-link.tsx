import { ActionIcon, Anchor, CopyButton, Tooltip } from '@mantine/core';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import { AnchorHTMLAttributes, PropsWithChildren } from 'react';
import { CommonTranslations } from '../../translations/common-translations';

export function openLink(url?: string) {
  if (url) {
    if (window.electron?.openExternalLink) {
      window.electron.openExternalLink(url);
    } else {
      window.open(url, '_blank');
    }
  }
}

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
              label={
                copied ? (
                  <CommonTranslations.CopiedToClipboard />
                ) : (
                  <CommonTranslations.CopyToClipboard />
                )
              }
              withArrow
              position="right"
            >
              <ActionIcon
                style={{ verticalAlign: 'middle' }}
                color={copied ? 'teal' : 'blue'}
                variant="subtle"
                onClick={copy}
                fs="inherit"
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
