import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTab,
  EuiTabs,
  EuiTitle,
} from '@elastic/eui';
import { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useQuery } from 'react-query';
import websitesApi from '../../../api/websites.api';
import { useFlyoutToggle } from '../../../hooks/use-flyout-toggle';
import { AccountKeybinding } from '../../../shared/app-keybindings';
import { SettingsStore } from '../../../stores/settings.store';
import { useStore } from '../../../stores/use-store';
import Keybinding, { KeybindingProps } from '../../app/keybinding/keybinding';
import Loading from '../../shared/loading/loading';
import SwitchComponent from '../../shared/switch-component/switch-component';
import { AccountLoginContainer } from '../account-login-container/account-login-container';

export function AccountLoginFlyout() {
  const [isOpen, toggle] = useFlyoutToggle('accountFlyoutVisible');
  const { isLoading, data: availableWebsites } = useQuery('website-info', () =>
    websitesApi.getWebsiteInfo().then((res) => res.body)
  );

  const { isLoading: isLoadingStore, state: settingsState } =
    useStore(SettingsStore);

  const keybindingProps: KeybindingProps = {
    keybinding: AccountKeybinding,
    onActivate: () => {},
  };
  const [selectedTabId, setSelectedTabId] = useState('accounts');

  if (!isOpen) {
    return null;
  }

  const onSelectedTabChanged = (id: string) => setSelectedTabId(id);

  const tabs = [
    {
      id: 'accounts',
      name: <FormattedMessage id="account.login" defaultMessage="Login" />,
    },
    {
      id: 'account-groups',
      name: <FormattedMessage id="account.groups" defaultMessage="Groups" />,
    },
  ];

  const renderTabs = tabs.map((tab) => (
    <EuiTab
      onClick={() => onSelectedTabChanged(tab.id)}
      isSelected={tab.id === selectedTabId}
      key={tab.id}
    >
      {tab.name}
    </EuiTab>
  ));

  return (
    <EuiFlyout
      ownFocus
      onClose={() => {
        toggle(false);
      }}
      style={{ minWidth: '75vw' }}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <div>
            <Keybinding displayOnly {...keybindingProps}>
              <FormattedMessage id="accounts" defaultMessage="Accounts" />
            </Keybinding>
          </div>
        </EuiTitle>
        <EuiTabs bottomBorder={false} style={{ marginBottom: '-24px' }}>
          {renderTabs}
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <Loading isLoading={isLoading && isLoadingStore}>
          <SwitchComponent
            selected={selectedTabId}
            options={{
              accounts: (
                <AccountLoginContainer
                  settings={settingsState[0]}
                  availableWebsites={availableWebsites || []}
                />
              ),
              'account-groups': null,
            }}
          />
        </Loading>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
