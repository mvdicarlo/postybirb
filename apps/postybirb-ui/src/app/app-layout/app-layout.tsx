import {
  EuiErrorBoundary,
  EuiPage,
  EuiPageBody,
  EuiPageSection,
} from '@elastic/eui';
import { useContext } from 'react';
import { Outlet } from 'react-router-dom';
import { AppThemeContext } from '../app-theme-provider';
import AppFlyouts from './app-flyouts';
import AppSideNav from './app-side-nav';

export default function AppLayout() {
  const [theme] = useContext(AppThemeContext);

  return (
    <EuiPage paddingSize="none">
      <AppSideNav />
      <AppFlyouts />

      <EuiPageBody
        paddingSize="none"
        borderRadius="none"
        className={`postybirb__page-body ${theme}`}
      >
        <EuiPageSection color="transparent" className="postybirb__page-section">
          <EuiErrorBoundary>
            <Outlet />
          </EuiErrorBoundary>
        </EuiPageSection>
      </EuiPageBody>
    </EuiPage>
  );
}
