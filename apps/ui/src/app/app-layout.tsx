import {
  EuiButton,
  EuiCollapsibleNav,
  EuiCollapsibleNavGroup,
  EuiErrorBoundary,
  EuiListGroup,
  EuiListGroupItem,
  EuiPage,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageSideBar,
  EuiSideNav,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { AccountLoginFlyout } from '../components/account/account-login-flyout';
import Keybinding, {
  KeybindingProps,
  useKeybinding,
} from '../components/app/keybinding/keybinding';
import Routes from '../pages/routes';
import {
  AccountKeybinding,
  HomeKeybinding,
  SettingsKeybinding,
} from '../shared/keybindings';
import AppSearch from './app-search';
import AppSettings from './app-settings';
import './app.css';

function AppImage() {
  return (
    <img
      className="euiIcon euiIcon--large euiHeaderLogo__icon"
      src="/assets/app-icon.png"
      alt="postybirb icon"
    />
  );
}

export default function AppLayout() {
  const [accountLoginVisible, setAccountLoginVisible] =
    useState<boolean>(false);
  const [settingsVisible, setSettingsVisible] = useState<boolean>(false);

  const toggleAccountLogin = () => setAccountLoginVisible(!accountLoginVisible);
  const toggleSettings = () => setSettingsVisible(!settingsVisible);

  const settingsKeybinding = {
    keybinding: SettingsKeybinding,
    onActivate: toggleSettings,
  };

  const homeKeybinding = {
    keybinding: HomeKeybinding,
    onActivate: () => {},
  };

  const accountKeybinding = {
    keybinding: AccountKeybinding,
    onActivate: toggleAccountLogin,
  };

  useKeybinding(settingsKeybinding);
  useKeybinding(accountKeybinding);
  useKeybinding(homeKeybinding);

  return (
    <EuiPage paddingSize="none">
      {/* <EuiCollapsibleNav
        paddingSize="l"
        aria-label="Main navigation"
        isDocked
        isOpen
        onClose={() => {}}
      > */}
      <EuiPageSideBar
        aria-label="Main navigation"
        sticky
        className="euiFlyout euiFlyout--push euiFlyout--left"
      >
        <EuiCollapsibleNavGroup
          className="eui-yScroll"
          initialIsOpen
          isCollapsible={false as true}
          background="dark"
          iconType={AppImage}
          iconSize="xl"
          title={
            <span>
              PostyBirb
              <span className="text-xs ml-1">
                {window.electron.app_version}
              </span>
            </span>
          }
        >
          <AppSearch />
          <EuiSpacer size="s" />
          <EuiButton
            color="success"
            aria-label="Update PostyBirb"
            fullWidth
            iconType="sortUp"
          >
            <FormattedMessage id="update" defaultMessage="Update" />
          </EuiButton>
          <EuiListGroup maxWidth="none" color="text" gutterSize="none" size="s">
            <EuiListGroupItem
              aria-label="PostyBirb login accounts"
              color="primary"
              size="s"
              iconType="users"
              onClick={toggleAccountLogin}
              label={
                <EuiToolTip
                  position="right"
                  content={
                    <Keybinding {...accountKeybinding}>
                      <FormattedMessage
                        id="accounts"
                        defaultMessage="Accounts"
                      />
                    </Keybinding>
                  }
                >
                  <FormattedMessage id="accounts" defaultMessage="Accounts" />
                </EuiToolTip>
              }
            />
            <EuiListGroupItem
              size="s"
              aria-label="PostyBirb home"
              iconType="home"
              onClick={() => undefined}
              showToolTip={false}
              label={
                <EuiToolTip
                  position="right"
                  content={
                    <Keybinding {...homeKeybinding}>
                      <FormattedMessage id="home" defaultMessage="Home" />
                    </Keybinding>
                  }
                >
                  <FormattedMessage id="home" defaultMessage="Home" />
                </EuiToolTip>
              }
            />
            <EuiListGroupItem
              size="s"
              aria-label="PostyBirb settings"
              iconType="gear"
              onClick={() => setSettingsVisible(!settingsVisible)}
              showToolTip={false}
              label={
                <EuiToolTip
                  position="right"
                  content={
                    <Keybinding displayOnly {...settingsKeybinding}>
                      <FormattedMessage
                        id="settings"
                        defaultMessage="Settings"
                      />
                    </Keybinding>
                  }
                >
                  <FormattedMessage id="settings" defaultMessage="Settings" />
                </EuiToolTip>
              }
            />
          </EuiListGroup>
        </EuiCollapsibleNavGroup>

        {/* <EuiFlexItem grow={false} style={{ flexShrink: 0 }}>
          <EuiCollapsibleNavGroup background="light" className="eui-yScroll">
            <EuiListGroup
              maxWidth="none"
              color="text"
              gutterSize="none"
              size="s"
            >
              <EuiListGroupItem
                size="s"
                aria-label="PostyBirb settings"
                iconType="gear"
                onClick={() => {}}
                label={
                  <FormattedMessage id="settings" defaultMessage="Settings" />
                }
              />
            </EuiListGroup>
          </EuiCollapsibleNavGroup>
          </EuiFlexItem> */}
      </EuiPageSideBar>
      {/* </EuiCollapsibleNav> */}

      <AppSettings
        onClose={() => setSettingsVisible(false)}
        isOpen={settingsVisible}
      />
      <AccountLoginFlyout
        onClose={() => setAccountLoginVisible(false)}
        isOpen={accountLoginVisible}
      />

      <EuiPageContent
        hasBorder={false}
        hasShadow={false}
        paddingSize="none"
        borderRadius="none"
        className="px-4"
      >
        <EuiSpacer />

        <EuiPageContentBody color="transparent" className="container mx-auto">
          <EuiErrorBoundary>
            <Routes />
          </EuiErrorBoundary>
        </EuiPageContentBody>
      </EuiPageContent>
    </EuiPage>
  );
}
