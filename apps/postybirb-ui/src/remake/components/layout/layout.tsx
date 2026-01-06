/**
 * Layout - Main layout shell using custom flexbox structure.
 * No AppShell - fully custom layout for maximum control.
 * Uses state-driven navigation instead of React Router.
 */

import { Box } from '@mantine/core';
import { navItems } from '../../config/nav-items';
import { useKeybindings } from '../../hooks/use-keybindings';
import { useViewState } from '../../stores/ui/navigation-store';
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
  const { visible: isSectionPanelVisible } = useSubNavVisible();

  // Set up global keybindings
  useKeybindings();

  return (
    <Box className="postybirb__layout">
      {/* Dialogs (not drawers - they render inside content_split) */}
      <SettingsDialog />

      {/* Side Navigation */}
      <SideNav
        items={navItems}
        collapsed={collapsed}
        onCollapsedChange={setSidenavCollapsed}
      />

      {/* Main Content Area */}
      <Box className={cn(['postybirb__main'], { 'postybirb__main--sidenav_collapsed': collapsed })}>
        {/* Split Content Area: Section Panel + Primary Content */}
        <Box id="postybirb-content-split" className="postybirb__content_split">
          {/* Section Panel (Master) - left side list */}
          {isSectionPanelVisible ? <SectionPanel viewState={viewState} /> : null}

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
      </Box>
    </Box>
  );
}
