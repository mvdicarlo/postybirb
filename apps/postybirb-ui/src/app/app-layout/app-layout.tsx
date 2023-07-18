import {
  EuiErrorBoundary,
  EuiPage,
  EuiPageBody,
  EuiPageSection,
} from '@elastic/eui';
import { useContext } from 'react';
import Routes from '../../pages/routes';
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
        hasBorder={false}
        hasShadow={false}
        paddingSize="none"
        borderRadius="none"
        className={`postybirb__page-body ${theme}`}
      >
        <EuiPageSection color="transparent" className="postybirb__page-section">
          <EuiErrorBoundary>
            <Routes />
          </EuiErrorBoundary>
        </EuiPageSection>
      </EuiPageBody>
    </EuiPage>
  );
}
