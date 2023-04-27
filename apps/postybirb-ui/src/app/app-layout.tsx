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
import {
  ArrowUpIcon,
  FileIcon,
  GearIcon,
  HomeIcon,
  MessageIcon,
  TagsIcon,
  UserGroupIcon,
  UserTagIcon,
} from '../components/shared/icons/Icons';
import { TagConvertersFlyout } from '../components/tag-converters/tag-converters-flyout/tag-converters-flyout';
import { TagGroupsFlyout } from '../components/tag-groups/tag-groups-flyout/tag-groups-flyout';
import { useGlobalState } from '../global-state';
import {
  FileSubmissionPath,
  HomePath,
  MessageSubmissionPath,
} from '../pages/route-paths';
import Routes from '../pages/routes';
import {
  AccountKeybinding,
  FileSubmissionsKeybinding,
  HomeKeybinding,
  MessageSubmissionsKeybinding,
  SettingsKeybinding,
  TagConvertersKeybinding,
  TagGroupsKeybinding,
} from '../shared/app-keybindings';
import AppSearch from './app-search';
import AppSettings from './app-settings';
import { AppThemeContext } from './app-theme-provider';
import './app.css';

function AppImage() {
  return (
    <img
      src="/assets/app-icon.png"
      alt="postybirb icon"
      width="24"
      height="24"
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

  const toggleTagGroups = (value?: boolean) =>
    setGlobalState({
      ...globalState,
      tagGroupsFlyoutVisible: value ?? !globalState.tagGroupsFlyoutVisible,
    });

  const toggleTagConverters = (value?: boolean) =>
    setGlobalState({
      ...globalState,
      tagConvertersFlyoutVisible:
        value ?? !globalState.tagConvertersFlyoutVisible,
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

  const messageSubmissionsKeybinding = {
    keybinding: MessageSubmissionsKeybinding,
    onActivate: () => {
      history(MessageSubmissionPath);
    },
  };

  const fileSubmissionsKeybinding = {
    keybinding: FileSubmissionsKeybinding,
    onActivate: () => {
      history(FileSubmissionPath);
    },
  };

  const accountKeybinding = {
    keybinding: AccountKeybinding,
    onActivate: () => toggleAccountLogin(),
  };

  const tagGroupsKeybinding = {
    keybinding: TagGroupsKeybinding,
    onActivate: () => toggleTagGroups(),
  };

  const tagConvertersKeybinding = {
    keybinding: TagConvertersKeybinding,
    onActivate: () => toggleTagConverters(),
  };

  useKeybinding(settingsKeybinding);
  useKeybinding(accountKeybinding);
  useKeybinding(homeKeybinding);
  useKeybinding(messageSubmissionsKeybinding);
  useKeybinding(fileSubmissionsKeybinding);
  useKeybinding(tagGroupsKeybinding);
  useKeybinding(tagConvertersKeybinding);

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
          {/* <EuiButton
            color="success"
            aria-label="Update PostyBirb"
            fullWidth
            iconType={ArrowUpIcon}
          >
            <FormattedMessage id="update" defaultMessage="Update" />
          </EuiButton> */}
          <EuiListGroup maxWidth="none" color="text" gutterSize="none" size="s">
            <EuiListGroupItem
              aria-label="PostyBirb login accounts"
              size="s"
              iconType={UserGroupIcon.GroupItem}
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
              iconType={HomeIcon.GroupItem}
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
              aria-label="PostyBirb file submissions"
              iconType={FileIcon.GroupItem}
              onClick={() => fileSubmissionsKeybinding.onActivate()}
              showToolTip={false}
              label={
                <EuiToolTip
                  position="right"
                  content={
                    <Keybinding {...fileSubmissionsKeybinding}>
                      <FormattedMessage
                        id="file-submissions"
                        defaultMessage="File Submissions"
                      />
                    </Keybinding>
                  }
                >
                  <FormattedMessage
                    id="file-submissions"
                    defaultMessage="File Submissions"
                  />
                </EuiToolTip>
              }
            />
            <EuiListGroupItem
              size="s"
              aria-label="PostyBirb message submissions"
              iconType={MessageIcon.GroupItem}
              onClick={() => messageSubmissionsKeybinding.onActivate()}
              showToolTip={false}
              label={
                <EuiToolTip
                  position="right"
                  content={
                    <Keybinding {...messageSubmissionsKeybinding}>
                      <FormattedMessage
                        id="message-submissions"
                        defaultMessage="Message Submissions"
                      />
                    </Keybinding>
                  }
                >
                  <FormattedMessage
                    id="message-submissions"
                    defaultMessage="Message Submissions"
                  />
                </EuiToolTip>
              }
            />
            <EuiListGroupItem
              aria-label="PostyBirb tag groups"
              size="s"
              iconType={TagsIcon.GroupItem}
              onClick={() => toggleTagGroups()}
              label={
                <EuiToolTip
                  position="right"
                  content={
                    <Keybinding {...tagGroupsKeybinding}>
                      <FormattedMessage
                        id="tag-groups"
                        defaultMessage="Tag Groups"
                      />
                    </Keybinding>
                  }
                >
                  <FormattedMessage
                    id="tag-groups"
                    defaultMessage="Tag Groups"
                  />
                </EuiToolTip>
              }
            />
            <EuiListGroupItem
              aria-label="PostyBirb tag converters"
              size="s"
              iconType={UserTagIcon.GroupItem}
              onClick={() => toggleTagConverters()}
              label={
                <EuiToolTip
                  position="right"
                  content={
                    <Keybinding {...tagConvertersKeybinding}>
                      <FormattedMessage
                        id="tag-converters"
                        defaultMessage="Tag Converters"
                      />
                    </Keybinding>
                  }
                >
                  <FormattedMessage
                    id="tag-converters"
                    defaultMessage="Tag Converters"
                  />
                </EuiToolTip>
              }
            />
            <EuiListGroupItem
              size="s"
              aria-label="PostyBirb settings"
              iconType={GearIcon.GroupItem}
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
      <TagGroupsFlyout
        onClose={() => toggleTagGroups(false)}
        isOpen={globalState.tagGroupsFlyoutVisible}
      />
      <TagConvertersFlyout
        onClose={() => toggleTagConverters(false)}
        isOpen={globalState.tagConvertersFlyoutVisible}
      />

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
