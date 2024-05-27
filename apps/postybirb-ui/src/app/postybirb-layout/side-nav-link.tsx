import { Kbd, NavLink, Tooltip } from '@mantine/core';
import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import tinykeys from 'tinykeys';
import { GlobalState } from '../../global-state';
import { useFlyoutToggle } from '../../hooks/use-flyout-toggle';

interface SideNavLinkType {
  icon: JSX.Element;
  label: JSX.Element;
  kbd?: string;
}

interface SideNavLinkHrefProps extends SideNavLinkType {
  type: 'link';
  location: string;
}

interface SideNavLinkDrawerProps extends SideNavLinkType {
  // eslint-disable-next-line react/no-unused-prop-types
  type: 'drawer';
  globalStateKey: keyof GlobalState;
}

export type SideNavLinkProps = SideNavLinkDrawerProps | SideNavLinkHrefProps;

type ExtendedSideNavLinkProps = SideNavLinkProps & {
  collapsed: boolean;
};

function BaseNavLink(
  props: SideNavLinkProps &
    ExtendedSideNavLinkProps & {
      onClick: () => void;
      active: boolean;
    }
) {
  const { kbd, active, icon, label, collapsed, onClick } = props;

  useEffect(() => {
    const unsubscribe = !kbd
      ? () => {}
      : tinykeys(window, {
          [kbd]: onClick,
        });

    return () => unsubscribe();
  }, [kbd, onClick]);

  const onClickCapture = useCallback(
    (
      e?: React.BaseSyntheticEvent<
        MouseEvent,
        EventTarget & HTMLAnchorElement,
        EventTarget
      >
    ) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      onClick();
    },
    [onClick]
  );

  const kbdEl = kbd ? (
    <Kbd style={{ verticalAlign: 'middle' }} ml="sm" size="xs">
      {kbd}
    </Kbd>
  ) : null;

  return (
    <Tooltip
      withArrow
      position="right"
      disabled={!collapsed}
      label={
        <span>
          {label}
          {kbdEl}
        </span>
      }
    >
      <NavLink
        active={active}
        href="#"
        leftSection={icon}
        label={
          collapsed ? null : (
            <span>
              {label}
              {kbdEl}
            </span>
          )
        }
        onClick={onClickCapture}
      />
    </Tooltip>
  );
}

function DrawerNavLink(
  props: SideNavLinkDrawerProps & ExtendedSideNavLinkProps
) {
  const { globalStateKey } = props;
  const [state, toggleFlyout] = useFlyoutToggle(globalStateKey);
  const onClick = useCallback(() => {
    toggleFlyout();
  }, [toggleFlyout]);
  return <BaseNavLink {...props} active={state} onClick={onClick} />;
}

export function LocationNavLink(
  props: SideNavLinkHrefProps & ExtendedSideNavLinkProps
) {
  const { location } = props;
  const activePage = useLocation();
  const navigateTo = useNavigate();
  const onClick = useCallback(() => {
    navigateTo(location);
  }, [location, navigateTo]);
  return (
    <BaseNavLink
      active={
        location === '/'
          ? activePage.pathname === location
          : activePage.pathname.startsWith(location)
      }
      {...props}
      onClick={onClick}
    />
  );
}

export function SideNavLink(
  props: SideNavLinkProps & ExtendedSideNavLinkProps
) {
  const { type } = props;
  if (type === 'link') {
    return <LocationNavLink {...props} />;
  }
  return <DrawerNavLink {...props} />;
}
