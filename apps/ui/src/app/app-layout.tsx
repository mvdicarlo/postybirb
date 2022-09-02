import {
  EuiButton,
  EuiCollapsibleNavGroup,
  EuiErrorBoundary,
  EuiListGroup,
  EuiListGroupItem,
  EuiPage,
  EuiPageBody,
  EuiPageSection,
  EuiPageSidebar,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import { useContext } from 'react';
import { FormattedMessage } from 'react-intl';
import { useNavigate } from 'react-router';
import { AccountLoginFlyout } from '../components/account/account-login-flyout/account-login-flyout';
import Keybinding, {
  useKeybinding,
} from '../components/app/keybinding/keybinding';
import { useGlobalState } from '../global-state';
import { HomePath, SubmissionsPath } from '../pages/route-paths';
import Routes from '../pages/routes';
import {
  AccountKeybinding,
  HomeKeybinding,
  SettingsKeybinding,
  SubmissionsKeybinding,
} from '../shared/keybindings';
import AppSearch from './app-search';
import AppSettings from './app-settings';
import { AppThemeContext } from './app-theme-provider';
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
  const history = useNavigate();
  const [globalState, setGlobalState] = useGlobalState();
  const [theme] = useContext(AppThemeContext);

  const toggleAccountLogin = (value?: boolean) =>
    setGlobalState({
      ...globalState,
      accountFlyoutVisible: value ?? !globalState.accountFlyoutVisible,
    });

  const toggleSettings = (value?: boolean) =>
    setGlobalState({
      ...globalState,
      settingsVisible: value ?? !globalState.settingsVisible,
    });

  const settingsKeybinding = {
    keybinding: SettingsKeybinding,
    onActivate: () => toggleSettings(),
  };

  const homeKeybinding = {
    keybinding: HomeKeybinding,
    onActivate: () => {
      history(HomePath);
    },
  };

  const submissionsKeybinding = {
    keybinding: SubmissionsKeybinding,
    onActivate: () => {
      history(SubmissionsPath);
    },
  };

  const accountKeybinding = {
    keybinding: AccountKeybinding,
    onActivate: () => toggleAccountLogin(),
  };

  useKeybinding(settingsKeybinding);
  useKeybinding(accountKeybinding);
  useKeybinding(homeKeybinding);
  useKeybinding(submissionsKeybinding);

  return (
    <EuiPage paddingSize="none">
      <EuiPageSidebar
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
              onClick={() => toggleAccountLogin()}
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
              onClick={() => homeKeybinding.onActivate()}
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
              aria-label="PostyBirb submissions"
              iconType="documents"
              onClick={() => submissionsKeybinding.onActivate()}
              showToolTip={false}
              label={
                <EuiToolTip
                  position="right"
                  content={
                    <Keybinding {...submissionsKeybinding}>
                      <FormattedMessage
                        id="submissions"
                        defaultMessage="Submissions"
                      />
                    </Keybinding>
                  }
                >
                  <FormattedMessage
                    id="submissions"
                    defaultMessage="Submissions"
                  />
                </EuiToolTip>
              }
            />
            <EuiListGroupItem
              size="s"
              aria-label="PostyBirb settings"
              iconType="gear"
              onClick={() => toggleSettings()}
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
      </EuiPageSidebar>

      <AppSettings
        onClose={() => toggleSettings(false)}
        isOpen={globalState.settingsVisible}
      />
      <AccountLoginFlyout
        onClose={() => toggleAccountLogin(false)}
        isOpen={globalState.accountFlyoutVisible}
      />

      <EuiPageBody
        hasBorder={false}
        hasShadow={false}
        paddingSize="none"
        borderRadius="none"
        className={`postybirb__page-body ${theme}`}
      >
        <EuiPageSection color="transparent">
          <EuiErrorBoundary>
            <Routes />
          </EuiErrorBoundary>
        </EuiPageSection>
      </EuiPageBody>
    </EuiPage>
  );
}
