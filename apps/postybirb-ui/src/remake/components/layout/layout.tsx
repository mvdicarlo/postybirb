/**
 * Layout - Main layout shell using custom flexbox structure.
 * No AppShell - fully custom layout for maximum control.
 */

import { Box } from '@mantine/core';
import { Outlet, useLocation } from 'react-router-dom';
import { getSubNavConfig, navItems } from '../../config/nav-items';
import { useKeybindings } from '../../hooks/use-keybindings';
import { useSidenavCollapsed, useUIStore } from '../../stores/ui-store';
import '../../styles/layout.css';
import {
    AccountDrawer,
    CustomShortcutsDrawer,
    NotificationsDrawer,
    SettingsDialog,
    TagConverterDrawer,
    TagGroupDrawer,
    UserConverterDrawer,
} from '../drawers/drawers';
import { RouteErrorBoundary } from '../error-boundary';
import { ContentArea } from './content-area';
import { ContentNavbar } from './content-navbar';
import { SideNav } from './side-nav';
import { SubNavBar } from './sub-nav-bar';

/**
 * Root layout component that orchestrates the overall page structure.
 * Includes sidenav, sub-nav bar, content navbar, and content area.
 */
export function Layout() {
  const collapsed = useSidenavCollapsed();
  const setSidenavCollapsed = useUIStore((state) => state.setSidenavCollapsed);
  const location = useLocation();

  // Set up global keybindings
  useKeybindings();

  // Get sub-nav configuration based on current route
  const subNavConfig = getSubNavConfig(location.pathname);

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
      <Box className={`postybirb__main ${collapsed ? 'postybirb__main--sidenav_collapsed' : ''}`}>
        {/* Sub-Navigation Bar */}
        <SubNavBar config={subNavConfig} />

        {/* Content Navbar with Pagination */}
        <ContentNavbar
          config={{
            showPagination: false,
            title: undefined,
          }}
        />

        {/* Primary Content Area */}
        <ContentArea>
          <RouteErrorBoundary routeKey={location.pathname}>
            <Outlet />
          </RouteErrorBoundary>
        </ContentArea>
      </Box>
    </Box>
  );
}
