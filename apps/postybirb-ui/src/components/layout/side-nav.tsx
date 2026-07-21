/**
 * SideNav - Collapsible side navigation panel using Mantine NavLink.
 * Supports expanded and collapsed states with smooth transitions.
 * Handles view, drawer, and custom navigation items.
 */

import { Trans, useLingui } from '@lingui/react/macro';
import {
  Box,
  Divider,
  Image,
  Kbd,
  NavLink as MantineNavLink,
  ScrollArea,
  Text,
  Title,
  Tooltip,
  VisuallyHidden,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import {
  IconChevronLeft,
  IconChevronRight,
  IconHelp,
} from '@tabler/icons-react';
import { memo, useEffect } from 'react';
import { formatKeybindingDisplay } from '../../shared/platform-utils';
import {
  useActiveDrawer,
  useDrawerActions,
} from '../../stores/ui/drawer-store';
import {
  useCurrentViewType,
  useSetViewState,
} from '../../stores/ui/navigation-store';
import { useTourActions } from '../../stores/ui/tour-store';
import '../../styles/layout.css';
import type { NavigationItem, SideNavProps } from '../../types/navigation';
import { cn } from '../../utils/class-names';
import { LanguagePicker } from '../language-picker';
import { LAYOUT_TOUR_ID } from '../onboarding-tour/tours/layout-tour';
import { ThemePicker } from '../theme-picker';
import { UpdateButton } from '../update-button';

function TourButton({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { t } = useLingui();
  const { startTour } = useTourActions();

  const navLink = (
    <MantineNavLink
      leftSection={<IconHelp size={20} />}
      label={collapsed ? undefined : <Trans>Take the Tour</Trans>}
      aria-label={collapsed ? t`Take the Tour` : undefined}
      onClick={() => {
        startTour(LAYOUT_TOUR_ID);
        onNavigate?.();
      }}
    />
  );

  if (collapsed) {
    return (
      <Tooltip label={<Trans>Take the Tour</Trans>} position="right" withArrow>
        <Box data-tour-id="tour-button">{navLink}</Box>
      </Tooltip>
    );
  }

  return <Box data-tour-id="tour-button">{navLink}</Box>;
}

/**
 * Render a single navigation item based on its type.
 */
const NavItemRenderer = memo(
  ({
    item,
    collapsed,
    isActive,
    onNavigate,
  }: {
    item: Exclude<NavigationItem, { type: 'divider' }>;
    collapsed: boolean;
    isActive: boolean;
    onNavigate?: () => void;
  }) => {
    const { toggleDrawer } = useDrawerActions();
    const setViewState = useSetViewState();

    // Handle theme item separately using the ThemePicker component
    if (item.type === 'theme') {
      return (
        <Box key={item.id} data-tour-id={item.id}>
          <ThemePicker collapsed={collapsed} kbd={item.kbd} />
        </Box>
      );
    }

    // Handle language item separately using the LanguagePicker component
    if (item.type === 'language') {
      return (
        <Box key={item.id} data-tour-id={item.id}>
          <LanguagePicker collapsed={collapsed} kbd={item.kbd} />
        </Box>
      );
    }

    // Build the label with optional keyboard shortcut (only for non-theme items)
    const accessibleLabelId = `sidenav-item-${item.id}-label`;
    const labelContent = collapsed ? undefined : (
      <Box className="postybirb__nav_item_label">
        <span>{item.label}</span>
        {item.kbd && <Kbd size="xs">{formatKeybindingDisplay(item.kbd)}</Kbd>}
      </Box>
    );

    // Common NavLink props
    const commonProps = {
      label: labelContent,
      leftSection: item.icon,
      disabled: item.disabled,
      'aria-labelledby': collapsed ? accessibleLabelId : undefined,
    };

    let navLinkContent: React.ReactNode;

    if (item.type === 'view') {
      navLinkContent = (
        <MantineNavLink
          onClick={() => {
            setViewState(item.viewState);
            onNavigate?.();
          }}
          active={isActive}
          aria-current={isActive ? 'page' : undefined}
          {...commonProps}
        />
      );
    } else if (item.type === 'link') {
      // Legacy link type - kept for backwards compatibility
      navLinkContent = (
        <MantineNavLink
          component="a"
          href={item.path}
          active={isActive}
          aria-current={isActive ? 'page' : undefined}
          onClick={onNavigate}
          {...commonProps}
        />
      );
    } else if (item.type === 'drawer') {
      navLinkContent = (
        <MantineNavLink
          onClick={() => {
            toggleDrawer(item.drawerKey);
            onNavigate?.();
          }}
          active={isActive}
          aria-pressed={isActive}
          {...commonProps}
        />
      );
    } else if (item.type === 'custom') {
      navLinkContent = (
        <MantineNavLink
          onClick={() => {
            item.onClick();
            onNavigate?.();
          }}
          {...commonProps}
        />
      );
    }

    if (collapsed) {
      return (
        <Tooltip
          key={item.id}
          label={
            <Box className="postybirb__tooltip_content">
              <span>{item.label}</span>
              {item.kbd && (
                <Kbd size="xs" className="postybirb__kbd_aligned">
                  {formatKeybindingDisplay(item.kbd)}
                </Kbd>
              )}
            </Box>
          }
          position="right"
          withArrow
        >
          <Box data-tour-id={item.id}>
            <VisuallyHidden id={accessibleLabelId}>{item.label}</VisuallyHidden>
            {navLinkContent}
          </Box>
        </Tooltip>
      );
    }

    return (
      <Box key={item.id} data-tour-id={item.id}>
        {navLinkContent}
      </Box>
    );
  },
);

/**
 * Collapsible side navigation component.
 * Shows icons + labels when expanded, icons only when collapsed.
 */
export function SideNav({ items, collapsed, onCollapsedChange }: SideNavProps) {
  const { t } = useLingui();
  const currentViewType = useCurrentViewType();
  const activeDrawer = useActiveDrawer();
  // eslint-disable-next-line lingui/no-unlocalized-strings
  const isNarrow = useMediaQuery('(max-width: 900px)');
  const [
    narrowOpened,
    { toggle: toggleNarrowNavigation, close: closeNarrowNavigation },
  ] = useDisclosure(false);
  const effectiveCollapsed = isNarrow ? !narrowOpened : collapsed;

  useEffect(() => {
    if (!isNarrow) closeNarrowNavigation();
  }, [isNarrow, closeNarrowNavigation]);

  useEffect(() => {
    if (!isNarrow || !narrowOpened) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeNarrowNavigation();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isNarrow, narrowOpened, closeNarrowNavigation]);

  return (
    <>
      {isNarrow && narrowOpened ? (
        <Box
          className="postybirb__sidenav_backdrop"
          onClick={closeNarrowNavigation}
          aria-hidden="true"
        />
      ) : null}
      <Box
        component="nav"
        aria-label={t`Main navigation`}
        className={cn(['postybirb__sidenav'], {
          'postybirb__sidenav--collapsed': effectiveCollapsed,
          'postybirb__sidenav--narrow_open': isNarrow && narrowOpened,
        })}
      >
        {/* Header with app icon */}
        <Box className="postybirb__sidenav_header">
          {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
          <Image src="/app-icon.png" alt="PostyBirb" w={32} h={32} />
          {!effectiveCollapsed && (
            // eslint-disable-next-line lingui/no-unlocalized-strings
            <Title order={4} className="postybirb__sidenav_title" ml="xs">
              PostyBirb
              <Text size="xs" c="dimmed" span pl={4}>
                {window.electron.app_version ?? '4.x.x'}
              </Text>
            </Title>
          )}
        </Box>

        {/* Navigation Items */}
        <ScrollArea
          id="postybirb-sidenav-navigation"
          className="postybirb__sidenav_scroll"
          type="hover"
          scrollbarSize={6}
        >
          <Box className="postybirb__sidenav_nav">
            {/* Collapse/Expand toggle as first nav item */}

            <MantineNavLink
              leftSection={
                effectiveCollapsed ? (
                  <IconChevronRight size={20} />
                ) : (
                  <IconChevronLeft size={20} />
                )
              }
              onClick={() => {
                if (isNarrow) {
                  toggleNarrowNavigation();
                } else {
                  onCollapsedChange(!collapsed);
                }
              }}
              aria-label={
                effectiveCollapsed
                  ? t`Expand navigation`
                  : t`Collapse navigation`
              }
              aria-controls="postybirb-sidenav-navigation"
              aria-expanded={!effectiveCollapsed}
            />

            {/* Update button - shows when update is available */}
            <UpdateButton
              collapsed={effectiveCollapsed}
              onNavigate={isNarrow ? closeNarrowNavigation : undefined}
            />

            {/* Tour button */}
            <TourButton
              collapsed={effectiveCollapsed}
              onNavigate={isNarrow ? closeNarrowNavigation : undefined}
            />

            {items.map((item) => {
              // Handle divider
              if (item.type === 'divider') {
                return <Divider key={item.id} my="xs" />;
              }

              // Determine if item is active based on current viewState or active drawer
              const isActive =
                (item.type === 'view' &&
                  item.viewState.type === currentViewType) ||
                (item.type === 'drawer' && item.drawerKey === activeDrawer);

              return (
                <NavItemRenderer
                  key={item.id}
                  item={item}
                  collapsed={effectiveCollapsed}
                  isActive={isActive}
                  onNavigate={isNarrow ? closeNarrowNavigation : undefined}
                />
              );
            })}
          </Box>
        </ScrollArea>
      </Box>
    </>
  );
}
