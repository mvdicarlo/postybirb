import { Anchor } from '@mantine/core';
import { AnchorHTMLAttributes, PropsWithChildren } from 'react';

export function ExternalLink(
  props: PropsWithChildren<
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'target' | 'onClick'>
  >
) {
  return (
    <Anchor
      {...props}
      target="_blank"
      c="blue"
      onClick={(event) => {
        if (window.electron?.openExternalLink) {
          event.preventDefault();
          window.electron.openExternalLink(
            (event.target as HTMLAnchorElement).href
          );
        }
      }}
    />
  );
}
