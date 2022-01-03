import {
  EuiPage,
  EuiPageContent,
  EuiPageContentBody,
  EuiCollapsibleNav,
} from '@elastic/eui';
import { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import AppHeader from './app-header';
import './app.css';

export default function AppLayout() {
  const [showNavbar, setShowNavbar] = useState<boolean>(false);

  const toggleNavbar = () => setShowNavbar(!showNavbar);

  return (
    <>
      <AppHeader onMenuClick={toggleNavbar} />
      <EuiPage paddingSize="none">
        <EuiCollapsibleNav
          isOpen={showNavbar}
          onClose={toggleNavbar}
          maskProps={{
            className: 'main-nav-mask',
          }}
        >
          Info
        </EuiCollapsibleNav>
        <EuiPageContent
          hasBorder={false}
          hasShadow={false}
          paddingSize="none"
          borderRadius="none"
        >
          <EuiPageContentBody restrictWidth>
            <FormattedMessage id="message" defaultMessage="testing" />
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPage>
    </>
  );
}
