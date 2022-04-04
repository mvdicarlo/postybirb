import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiSwitch,
  EuiTitle,
} from '@elastic/eui';
import { useContext } from 'react';
import { FormattedMessage } from 'react-intl';
import Keybinding, {
  KeybindingProps,
} from '../components/app/keybinding/keybinding';
import { ModalProperties } from '../shared/common-properties/modal.properties';
import { SettingsKeybinding } from '../shared/keybindings';
import { AppThemeContext } from './app-theme-provider';

type AppSettingsProps = ModalProperties;

export default function AppSettings(props: AppSettingsProps) {
  const { onClose, isOpen } = props;
  const keybindingProps: KeybindingProps = {
    keybinding: SettingsKeybinding,
    onActivate: () => {},
  };

  const [theme, setTheme] = useContext(AppThemeContext);

  if (!isOpen) {
    return null;
  }

  return (
    <EuiFlyout ownFocus onClose={onClose}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <Keybinding displayOnly {...keybindingProps}>
            <FormattedMessage id="settings" defaultMessage="Settings" />
          </Keybinding>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm component="form">
          <EuiFormRow
            label={
              <FormattedMessage
                id="settings.theme-label"
                defaultMessage="Theme"
              />
            }
            hasChildLabel={false}
          >
            <EuiSwitch
              name="switch"
              label={
                theme === 'light' ? (
                  <FormattedMessage
                    id="settings.light-theme"
                    defaultMessage="Light"
                  />
                ) : (
                  <FormattedMessage
                    id="settings.dark-theme"
                    defaultMessage="Dark"
                  />
                )
              }
              onChange={() => {
                setTheme(theme === 'light' ? 'dark' : 'light');
              }}
              checked={theme === 'light'}
            />
          </EuiFormRow>
        </EuiForm>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
