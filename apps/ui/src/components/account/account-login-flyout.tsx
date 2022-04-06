import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiTabs,
  EuiTab,
  EuiSpacer,
} from '@elastic/eui';
import { useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { ModalProperties } from '../../shared/common-properties/modal.properties';
import { AccountKeybinding } from '../../shared/keybindings';
import Keybinding, { KeybindingProps } from '../app/keybinding/keybinding';
import { AccountLoginContainer } from './account-login-container';

type AccountLoginFlyoutProps = ModalProperties;

export function AccountLoginFlyout(props: AccountLoginFlyoutProps) {
  const { onClose, isOpen } = props;
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
      name: 'Login',
    },
    {
      id: 'account-groups',
      name: 'Groups',
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
    <EuiFlyout ownFocus onClose={onClose}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <div>
            <Keybinding displayOnly {...keybindingProps}>
              <FormattedMessage id="accounts" defaultMessage="Accounts" />
            </Keybinding>
          </div>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiTabs bottomBorder={false} style={{ marginBottom: '-24px' }}>
          {renderTabs}
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <AccountLoginContainer />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
