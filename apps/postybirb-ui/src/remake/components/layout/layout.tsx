/**
 * Layout - Main layout shell using custom flexbox structure.
 * No AppShell - fully custom layout for maximum control.
 * Uses state-driven navigation instead of React Router.
 */

import { Box } from '@mantine/core';
import { navItems } from '../../config/nav-items';
import { useKeybindings } from '../../hooks/use-keybindings';
import {
    useSidenavCollapsed,
    useUIStore,
    useViewState,
} from '../../stores/ui-store';
import '../../styles/layout.css';
import { hasSectionPanel } from '../../types/view-state';
import { cn } from '../../utils/class-names';
import {
    AccountDrawer,
    CustomShortcutsDrawer,
    NotificationsDrawer,
    SettingsDialog,
    TagConverterDrawer,
    TagGroupDrawer,
    UserConverterDrawer,
} from '../drawers/drawers';
import { PrimaryContent } from './primary-content';
import { SectionPanel } from './section-panel';
import { SideNav } from './side-nav';
import { SubNavBar } from './sub-nav-bar';

/**
 * Root layout component that orchestrates the overall page structure.
 * Includes sidenav, section panel (master), and primary content (detail).
 */
export function Layout() {
  const collapsed = useSidenavCollapsed();
  const setSidenavCollapsed = useUIStore((state) => state.setSidenavCollapsed);
  const viewState = useViewState();

  // Set up global keybindings
  useKeybindings();

  // Determine if the current view has a section panel
  const showSectionPanel = hasSectionPanel(viewState);

  return (
    <Box className="postybirb__layout">
      {/* Dialogs and Drawers */}
      <SettingsDialog />
      <AccountDrawer />
      <TagGroupDrawer />
      <TagConverterDrawer />
      <UserConverterDrawer />
      <NotificationsDrawer />
      <CustomShortcutsDrawer />

      {/* Side Navigation */}
      <SideNav
        items={navItems}
        collapsed={collapsed}
        onCollapsedChange={setSidenavCollapsed}
      />

      {/* Main Content Area */}
      <Box className={cn(['postybirb__main'], { 'postybirb__main--sidenav_collapsed': collapsed })}>
        {/* Sub-Navigation Bar - shown based on view state */}
        <SubNavBar
          config={{
            visible: showSectionPanel,
            items: [],
          }}
        />

        {/* Split Content Area: Section Panel + Primary Content */}
        <Box className="postybirb__content_split">
          {/* Section Panel (Master) - left side list */}
          <SectionPanel viewState={viewState} />

          {/* Primary Content (Detail) - right side detail view */}
          <PrimaryContent viewState={viewState} />
        </Box>
      </Box>
    </Box>
  );
}
