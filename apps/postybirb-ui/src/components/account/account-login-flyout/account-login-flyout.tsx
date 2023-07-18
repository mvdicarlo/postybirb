import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from 'react-intl';
import { useQuery } from 'react-query';
import websitesApi from '../../../api/websites.api';
import { useFlyoutToggle } from '../../../hooks/use-flyout-toggle';
import { AccountKeybinding } from '../../../shared/app-keybindings';
import { SettingsStore } from '../../../stores/settings.store';
import { useStore } from '../../../stores/use-store';
import Keybinding, { KeybindingProps } from '../../app/keybinding/keybinding';
import Loading from '../../shared/loading/loading';
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

  if (!isOpen) {
    return null;
  }

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
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <Loading isLoading={isLoading && isLoadingStore}>
          <AccountLoginContainer
            settings={settingsState[0]}
            availableWebsites={availableWebsites || []}
          />
        </Loading>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
