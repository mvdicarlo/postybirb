import { EuiLink, EuiLinkProps } from '@elastic/eui';
import React from 'react';
import { useNavigate, createPath } from 'react-router';

const isModifiedEvent = (event: React.MouseEvent) =>
  !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);

const isLeftClickEvent = (event: React.MouseEvent) => event.button === 0;

const isTargetBlank = (event: React.MouseEvent) => {
  const target = (event.target as HTMLAnchorElement).getAttribute('target');
  return target && target !== '_self';
};

export function useCustomLinkRouting(to: string): {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  href: any;
  onClick: (event: React.MouseEvent) => void;
} {
  const history = useNavigate();

  function onClick(event: React.MouseEvent): void {
    if (event.defaultPrevented) {
      return;
    }

    // Let the browser handle links that open new tabs/windows
    if (
      isModifiedEvent(event) ||
      !isLeftClickEvent(event) ||
      isTargetBlank(event)
    ) {
      return;
    }

    // Prevent regular link behavior, which causes a browser refresh.
    event.preventDefault();

    // Push the route to the history.
    history(to);
  }

  // Generate the correct link href (with basename accounted for)
  const href = createPath({ pathname: to });

  return { href, onClick };
}

export default function EuiCustomLink({
  to,
  ...rest
}: EuiLinkProps & { to: string }) {
  const { onClick, href } = useCustomLinkRouting(to);
  const props = { ...rest, href, onClick };
  return <EuiLink {...props} />;
}
