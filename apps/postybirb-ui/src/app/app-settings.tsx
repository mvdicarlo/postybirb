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
import { SettingsKeybinding } from '../shared/app-keybindings';
import { AppThemeContext } from './app-theme-provider';
import { useFlyoutToggle } from '../hooks/use-flyout-toggle';

export default function AppSettings() {
  const [isOpen, toggle] = useFlyoutToggle('settingsVisible');
  const keybindingProps: KeybindingProps = {
    keybinding: SettingsKeybinding,
    onActivate: () => {},
  };

  const [theme, setTheme] = useContext(AppThemeContext);

  if (!isOpen) {
    return null;
  }

  return (
    <EuiFlyout
      ownFocus
      onClose={() => {
        toggle(false);
      }}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <div>
            <Keybinding displayOnly {...keybindingProps}>
              <FormattedMessage id="settings" defaultMessage="Settings" />
            </Keybinding>
          </div>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm component="form" className="postybirb__settings">
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
