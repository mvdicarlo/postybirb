import { PropsWithChildren } from 'react';
import { useCustomLinkRouting } from './EuiCustomLink';

type RouterLinkAdapterProps = {
  to: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  children: any;
};

// Example
// <RouterLinkAdapter to="/location">
//  {(onClick, href) => <EuiLink onClick={onClick} href={href}>Link</EuiLink>}
// <RouterLinkAdapter/>

export function RouterLinkAdapter(
  props: PropsWithChildren<RouterLinkAdapterProps>
) {
  const { to, children } = props;
  const { href, onClick } = useCustomLinkRouting(to);
  return children(href, onClick);
}
