import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from 'react-intl';
import { ModalProperties } from '../../shared/common-properties/modal.properties';
import { AccountKeybinding } from '../../shared/keybindings';
import Keybinding, { KeybindingProps } from '../app/keybinding/keybinding';

type AccountLoginFlyoutProps = ModalProperties;

export function AccountLoginFlyout(props: AccountLoginFlyoutProps) {
  const { onClose, isOpen } = props;
  const keybindingProps: KeybindingProps = {
    keybinding: AccountKeybinding,
    onActivate: () => {},
  };

  if (!isOpen) {
    return null;
  }

  return (
    <EuiFlyout ownFocus onClose={onClose}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <Keybinding displayOnly {...keybindingProps}>
            <FormattedMessage id="accounts" defaultMessage="Accounts" />
          </Keybinding>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>Hi</EuiFlyoutBody>
    </EuiFlyout>
  );
}
