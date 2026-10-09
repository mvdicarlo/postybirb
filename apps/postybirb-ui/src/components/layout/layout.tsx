/**
 * Layout - Main layout shell using custom flexbox structure.
 * No AppShell - fully custom layout for maximum control.
 * Uses state-driven navigation instead of React Router.
 */

import { Trans } from '@lingui/react/macro';
import { Box, Button } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconArrowLeft } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { navItems } from '../../config/nav-items';
import { useKeybindings } from '../../hooks/use-keybindings';
import { useActiveDrawer } from '../../stores/ui/drawer-store';
import {
  useViewState,
  useViewStateActions,
} from '../../stores/ui/navigation-store';
import {
    useSidenavCollapsed,
    useSubNavVisible,
    useSubmissionsUIStore,
} from '../../stores/ui/submissions-ui-store';
import '../../styles/layout.css';
import { cn } from '../../utils/class-names';
import {
    CustomShortcutsDrawer,
    FileWatcherDrawer,
    GlobalSubmissionHistoryDrawer,
    NotificationsDrawer,
    ScheduleDrawer,
    SettingsDialog,
    TagConverterDrawer,
    TagGroupDrawer,
    UserConverterDrawer,
} from '../drawers/drawers';
import { PrimaryContent } from './primary-content';
import { SectionPanel } from './section-panel';
import { SideNav } from './side-nav';

/**
 * Root layout component that orchestrates the overall page structure.
 * Includes sidenav, section panel (master), and primary content (detail).
 */
export function Layout() {
  const collapsed = useSidenavCollapsed();
  const setSidenavCollapsed = useSubmissionsUIStore((state) => state.setSidenavCollapsed);
  const viewState = useViewState();
  const { setViewState } = useViewStateActions();
  const activeDrawer = useActiveDrawer();
  // eslint-disable-next-line lingui/no-unlocalized-strings
  const compact = useMediaQuery('(max-width: 48em)');
  const [compactNavExpanded, setCompactNavExpanded] = useState(false);
  const { visible: isSectionPanelVisible } = useSubNavVisible();
  const hasPanel = isSectionPanelVisible && viewState.type !== 'home';
  const hasSelection =
    'selectedId' in viewState.params
      ? Boolean(viewState.params.selectedId)
      : 'selectedIds' in viewState.params &&
        viewState.params.selectedIds.length > 0;

  useEffect(() => {
    setCompactNavExpanded(false);
  }, [viewState, activeDrawer]);

  const clearSelection = () => {
    if (viewState.type === 'accounts') {
      setViewState({
        ...viewState,
        params: { ...viewState.params, selectedId: null },
      });
    } else if (viewState.type === 'templates') {
      setViewState({
        ...viewState,
        params: { ...viewState.params, selectedId: null },
      });
    } else if (viewState.type === 'file-submissions') {
      setViewState({
        ...viewState,
        params: { ...viewState.params, selectedIds: [] },
      });
    } else if (viewState.type === 'message-submissions') {
      setViewState({
        ...viewState,
        params: { ...viewState.params, selectedIds: [] },
      });
    }
  };

  // Set up global keybindings
  useKeybindings();

  return (
    <Box className="postybirb__layout">
      {/* Dialogs (not drawers - they render inside content_split) */}
      <SettingsDialog />

      {/* Side Navigation */}
      <SideNav
        items={navItems}
        collapsed={compact ? !compactNavExpanded : collapsed}
        onCollapsedChange={
          compact
            ? (nextCollapsed) => setCompactNavExpanded(!nextCollapsed)
            : setSidenavCollapsed
        }
      />

      {/* Main Content Area */}
      <Box
        className={cn(['postybirb__main'], {
          'postybirb__main--sidenav_collapsed': collapsed,
        })}
      >
        {compact && hasPanel && hasSelection && (
          <Box p="xs">
            <Button
              variant="subtle"
              size="xs"
              leftSection={<IconArrowLeft size={16} />}
              onClick={clearSelection}
            >
              <Trans>Back to list</Trans>
            </Button>
          </Box>
        )}
        {/* Split Content Area: Section Panel + Primary Content */}
        <Box
          id="postybirb-content-split"
          className="postybirb__content_split"
          data-has-panel={hasPanel || undefined}
          data-compact-detail={hasSelection || undefined}
        >
          {/* Section Panel (Master) - left side list */}
          {isSectionPanelVisible ? (
            <SectionPanel viewState={viewState} />
          ) : null}

          {/* Primary Content (Detail) - right side detail view */}
          <PrimaryContent viewState={viewState} />
        </Box>

        {/* Section Drawers - use Portal to render into content_split */}
        <TagGroupDrawer />
        <TagConverterDrawer />
        <UserConverterDrawer />
        <NotificationsDrawer />
        <CustomShortcutsDrawer />
        <FileWatcherDrawer />
        <ScheduleDrawer />
        <GlobalSubmissionHistoryDrawer />
      </Box>
    </Box>
  );
}
