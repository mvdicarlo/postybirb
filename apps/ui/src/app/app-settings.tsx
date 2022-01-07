import {
  EuiForm,
  EuiFormRow,
  EuiHeaderSectionItemButton,
  EuiIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiSwitch,
} from '@elastic/eui';
import { useContext, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import Keybinding, {
  KeybindingProps,
  useKeybinding,
} from '../components/app/keybinding/keybinding';
import { AppThemeContext } from './app-theme-provider';

export default function AppSettings() {
  const [isOpen, setOpen] = useState<boolean>(false);
  const [theme, setTheme] = useContext(AppThemeContext);

  const toggleOpen = () => setOpen(!isOpen);

  const keybindingProps: KeybindingProps = {
    keybinding: 'Alt+S',
    onActivate: toggleOpen,
  };

  useKeybinding(keybindingProps);

  return (
    <EuiPopover
      panelClassName="app-settings"
      button={
        <EuiHeaderSectionItemButton
          aria-haspopup="true"
          aria-aria-expanded={isOpen}
          aria-label="Settings"
          isSelected={isOpen}
          onClick={toggleOpen}
        >
          <EuiIcon type="gear" />
        </EuiHeaderSectionItemButton>
      }
      isOpen={isOpen}
      closePopover={() => setOpen(false)}
    >
      <EuiPopoverTitle paddingSize="s">
        <Keybinding displayOnly {...keybindingProps}>
          <FormattedMessage id="settings" defaultMessage="Settings" />
        </Keybinding>
      </EuiPopoverTitle>
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
    </EuiPopover>
  );
}
