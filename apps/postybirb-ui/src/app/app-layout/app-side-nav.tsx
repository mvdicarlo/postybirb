import {
  EuiCollapsibleNavGroup,
  EuiErrorBoundary,
  EuiListGroup,
  EuiListGroupItem,
  EuiPageSidebar,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import { msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import { useNavigate } from 'react-router';
import Keybinding, {
  useKeybinding,
} from '../../components/app/keybinding/keybinding';
import UpdateButton from '../../components/app/update-button/update-button';
import {
  FileIcon,
  GearIcon,
  HomeIcon,
  MessageIcon,
  TagsIcon,
  UserGroupIcon,
  UserTagIcon,
} from '../../components/shared/icons/Icons';
import {
  FileSubmissionPath,
  HomePath,
  MessageSubmissionPath,
} from '../../pages/route-paths';
import {
  AccountKeybinding,
  FileSubmissionsKeybinding,
  HomeKeybinding,
  MessageSubmissionsKeybinding,
  SettingsKeybinding,
  TagConvertersKeybinding,
  TagGroupsKeybinding,
} from '../../shared/app-keybindings';
import AppSearch from '../app-search';
import { useDrawerToggle } from '../postybirb-layout/drawers/use-drawer-toggle';

function AppImage() {
  return (
    // eslint-disable-next-line lingui/no-unlocalized-strings
    <img src="/app-icon.png" alt="postybirb icon" width="24" height="24" />
  );
}

export default function AppSideNav() {
  const history = useNavigate();

  const [, toggleAccountLoginPage] = useDrawerToggle('accountFlyoutVisible');
  const [, toggleTagGroupsPage] = useDrawerToggle('tagGroupsFlyoutVisible');
  const [, toggleTagConvertersPage] = useDrawerToggle(
    'tagConvertersFlyoutVisible'
  );
  const [, toggleSettings] = useDrawerToggle('settingsVisible');

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
    onActivate: () => toggleAccountLoginPage(),
  };

  const tagGroupsKeybinding = {
    keybinding: TagGroupsKeybinding,
    onActivate: () => toggleTagGroupsPage(),
  };

  const tagConvertersKeybinding = {
    keybinding: TagConvertersKeybinding,
    onActivate: () => toggleTagConvertersPage(),
  };

  useKeybinding(settingsKeybinding);
  useKeybinding(accountKeybinding);
  useKeybinding(homeKeybinding);
  useKeybinding(messageSubmissionsKeybinding);
  useKeybinding(fileSubmissionsKeybinding);
  useKeybinding(tagGroupsKeybinding);
  useKeybinding(tagConvertersKeybinding);

  const { _ } = useLingui();

  return (
    <EuiPageSidebar
      aria-label={_(msg`Main navigation`)}
      sticky
      className="euiFlyout euiFlyout--push euiFlyout--left"
    >
      <EuiCollapsibleNavGroup
        className="eui-yScroll"
        isCollapsible={false as true}
        background="dark"
        iconType={AppImage}
        iconSize="xl"
        title={
          // eslint-disable-next-line lingui/no-unlocalized-strings
          <span>
            PostyBirb
            <span className="text-xs ml-1">{window.electron.app_version}</span>
          </span>
        }
      >
        <EuiErrorBoundary>
          <AppSearch />
        </EuiErrorBoundary>
        <EuiSpacer size="s" />
        <UpdateButton />
        <EuiListGroup maxWidth="none" color="text" gutterSize="none" size="s">
          {...[
            { label: msg`Home`, keybinding: homeKeybinding, icon: HomeIcon },
            {
              label: msg`Accounts`,
              keybinding: accountKeybinding,
              onClick: toggleAccountLoginPage,
              icon: UserGroupIcon,
            },
            {
              label: msg`File Submissions`,
              keybinding: fileSubmissionsKeybinding,
              icon: FileIcon,
            },
            {
              label: msg`Message Submissions`,
              keybinding: messageSubmissionsKeybinding,
              icon: MessageIcon,
            },
            {
              label: msg`Tag Groups`,
              keybinding: tagGroupsKeybinding,
              onClick: toggleTagGroupsPage,
              icon: TagsIcon,
            },
            {
              label: msg`Tag Converters`,
              keybinding: tagConvertersKeybinding,
              onClick: toggleTagConvertersPage,
              icon: UserTagIcon,
            },
            {
              label: msg`Settings`,
              keybinding: settingsKeybinding,
              onClick: toggleSettings,
              icon: GearIcon,
            },
          ].map((e) => {
            const navigationName = _(e.label);
            return (
              <EuiListGroupItem
                size="s"
                aria-label={_(msg`Navigate to ${navigationName}`)}
                iconType={e.icon.GroupItem}
                onClick={() => (e.onClick ?? e.keybinding.onActivate)()}
                showToolTip={false}
                key={_(e.label)}
                label={
                  <EuiToolTip
                    position="right"
                    content={
                      <Keybinding {...e.keybinding}>{_(e.label)}</Keybinding>
                    }
                  >
                    <span>{_(e.label)}</span>
                  </EuiToolTip>
                }
              />
            );
          })}
        </EuiListGroup>
      </EuiCollapsibleNavGroup>
    </EuiPageSidebar>
  );
}
