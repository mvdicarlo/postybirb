import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
} from '@elastic/eui';
import { useContext } from 'react';
import { FormattedMessage } from 'react-intl';
import { useQuery } from 'react-query';
import settingsApi from '../api/settings.api';
import Keybinding, {
  KeybindingProps,
} from '../components/app/keybinding/keybinding';
import Loading from '../components/shared/loading/loading';
import { useFlyoutToggle } from '../hooks/use-flyout-toggle';
import { SettingsKeybinding } from '../shared/app-keybindings';
import { AppThemeContext } from './app-theme-provider';

function StartupSettings() {
  const { data, isLoading, refetch } = useQuery(
    'startup',
    () => settingsApi.getStartupOptions().then((res) => res.body),
    {
      cacheTime: 0,
    }
  );

  return (
    <Loading isLoading={isLoading}>
      <div>
        <EuiTitle size="xxs">
          <h5>PostyBirb Startup Settings</h5>
        </EuiTitle>
        <EuiForm>
          <EuiFormRow
            label={
              <FormattedMessage
                id="settings.startup.label"
                defaultMessage="Open on startup"
              />
            }
          >
            <EuiSwitch
              name="switch"
              label={
                data?.startAppOnSystemStartup
                  ? 'PostyBirb will open on startup'
                  : 'PostyBirb will not open on startup'
              }
              onChange={(e) => {
                settingsApi
                  .updateOnSystemStartup(e.target.checked)
                  .finally(() => {
                    refetch();
                  });
              }}
              checked={data?.startAppOnSystemStartup ?? false}
            />
          </EuiFormRow>
        </EuiForm>
      </div>
    </Loading>
  );
}

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
        <EuiSpacer />
        <StartupSettings />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
