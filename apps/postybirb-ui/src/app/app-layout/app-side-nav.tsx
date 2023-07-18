import {
  EuiCollapsibleNavGroup,
  EuiListGroup,
  EuiListGroupItem,
  EuiPageSidebar,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from 'react-intl';
import { useNavigate } from 'react-router';
import Keybinding, {
  useKeybinding,
} from '../../components/app/keybinding/keybinding';
import {
  FileIcon,
  GearIcon,
  HomeIcon,
  MessageIcon,
  TagsIcon,
  UserGroupIcon,
  UserTagIcon,
} from '../../components/shared/icons/Icons';
import { useFlyoutToggle } from '../../hooks/use-flyout-toggle';
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

export default function AppSideNav() {
  const history = useNavigate();

  const [, toggleAccountLoginPage] = useFlyoutToggle('accountFlyoutVisible');
  const [, toggleTagGroupsPage] = useFlyoutToggle('tagGroupsFlyoutVisible');
  const [, toggleTagConvertersPage] = useFlyoutToggle(
    'tagConvertersFlyoutVisible'
  );
  const [, toggleSettings] = useFlyoutToggle('settingsVisible');

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

  return (
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
            <span className="text-xs ml-1">{window.electron.app_version}</span>
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
            aria-label="PostyBirb login accounts"
            size="s"
            iconType={UserGroupIcon.GroupItem}
            onClick={() => toggleAccountLoginPage()}
            label={
              <EuiToolTip
                position="right"
                content={
                  <Keybinding {...accountKeybinding}>
                    <FormattedMessage id="accounts" defaultMessage="Accounts" />
                  </Keybinding>
                }
              >
                <FormattedMessage id="accounts" defaultMessage="Accounts" />
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
            onClick={() => toggleTagGroupsPage()}
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
                <FormattedMessage id="tag-groups" defaultMessage="Tag Groups" />
              </EuiToolTip>
            }
          />
          <EuiListGroupItem
            aria-label="PostyBirb tag converters"
            size="s"
            iconType={UserTagIcon.GroupItem}
            onClick={() => toggleTagConvertersPage()}
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
                    <FormattedMessage id="settings" defaultMessage="Settings" />
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
  );
}
