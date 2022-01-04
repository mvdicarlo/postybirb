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
import { AppThemeContext } from './app-theme-provider';

export default function AppSettings() {
  const [isOpen, setOpen] = useState<boolean>(false);
  const [theme, setTheme] = useContext(AppThemeContext);
  return (
    <>
      <EuiPopover
        panelClassName="app-settings"
        button={
          <EuiHeaderSectionItemButton
            aria-haspopup="true"
            aria-aria-expanded={isOpen}
            aria-label="Settings"
            isSelected={isOpen}
            onClick={() => setOpen(!isOpen)}
          >
            <EuiIcon type="gear" />
          </EuiHeaderSectionItemButton>
        }
        isOpen={isOpen}
        closePopover={() => setOpen(false)}
      >
        <EuiPopoverTitle paddingSize="s">
          <FormattedMessage id="settings" defaultMessage="Settings" />
          <span className="ml-1">
            <kbd>Alt</kbd>+<kbd>S</kbd>
          </span>
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
    </>
  );
}
