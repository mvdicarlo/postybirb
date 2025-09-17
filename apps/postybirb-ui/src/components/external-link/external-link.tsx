import { Anchor } from '@mantine/core';
import { AnchorHTMLAttributes, PropsWithChildren } from 'react';

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
  );
}
