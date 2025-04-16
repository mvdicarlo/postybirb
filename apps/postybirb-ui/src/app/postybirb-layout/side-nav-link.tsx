import { Kbd, NavLink, Tooltip } from '@mantine/core';
import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { tinykeys } from 'tinykeys';
import { DrawerGlobalState } from './drawers/drawer-global-state';
import { useDrawerToggle } from './drawers/use-drawer-toggle';
import './side-nav-link.css';

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
  globalStateKey: keyof DrawerGlobalState;
}

interface SideNavLinkCustomProps extends SideNavLinkType {
  type: 'custom';
  onClick: () => void;
}

export type SideNavLinkProps =
  | SideNavLinkDrawerProps
  | SideNavLinkHrefProps
  | SideNavLinkCustomProps;

type ExtendedSideNavLinkProps = SideNavLinkProps & {
  collapsed: boolean;
};

function BaseNavLink(
  props: SideNavLinkProps &
    ExtendedSideNavLinkProps & {
      onClick: () => void;
      active: boolean;
    },
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
      >,
    ) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      onClick();
    },
    [onClick],
  );

  const kbdEl = kbd ? (
    <Kbd className="nav-link-kbd" size="xs">
      {kbd}
    </Kbd>
  ) : null;

  return (
    <Tooltip
      withArrow
      position="right"
      disabled={!collapsed}
      label={
        <span className="nav-link-tooltip">
          {label}
          {kbdEl && <span className="nav-link-tooltip-kbd">{kbd}</span>}
        </span>
      }
    >
      <NavLink
        active={active}
        href="#"
        leftSection={collapsed ? null : icon}
        label={
          collapsed ? (
            <span className="nav-link-icon-only">{icon}</span>
          ) : (
            <span className="nav-link-content">
              <span className="nav-link-label">{label}</span>
              {kbdEl}
            </span>
          )
        }
        onClick={onClickCapture}
        className={`postybirb-nav-link ${active ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`}
      />
    </Tooltip>
  );
}

function DrawerNavLink(
  props: SideNavLinkDrawerProps & ExtendedSideNavLinkProps,
) {
  const { globalStateKey } = props;
  const [state, toggleFlyout] = useDrawerToggle(globalStateKey);
  const onClick = useCallback(() => {
    toggleFlyout();
  }, [toggleFlyout]);
  return <BaseNavLink {...props} active={state} onClick={onClick} />;
}

export function LocationNavLink(
  props: SideNavLinkHrefProps & ExtendedSideNavLinkProps,
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
  props: SideNavLinkProps &
    ExtendedSideNavLinkProps & {
      onClick?: () => void;
    },
) {
  const { type } = props;
  if (type === 'link') {
    return <LocationNavLink {...props} />;
  }
  if (type === 'custom') {
    const { onClick } = props;
    return <BaseNavLink {...props} active={false} onClick={onClick} />;
  }
  return <DrawerNavLink {...props} />;
}
