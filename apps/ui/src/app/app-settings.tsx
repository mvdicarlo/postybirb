import {
  EuiButtonIcon,
  EuiCode,
  EuiForm,
  EuiFormRow,
  EuiPopover,
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
        button={
          <EuiButtonIcon
            iconType="gear"
            aria-label="Settings"
            color="ghost"
            onClick={() => setOpen(!isOpen)}
          />
        }
        isOpen={isOpen}
        closePopover={() => setOpen(false)}
      >
        <EuiForm component="form">
          <EuiFormRow
            label={<FormattedMessage id="theme" defaultMessage="Theme" />}
            hasChildLabel={false}
          >
            <EuiSwitch
              name="switch"
              label={
                theme === 'light' ? (
                  <FormattedMessage id="dark-theme" defaultMessage="Light" />
                ) : (
                  <FormattedMessage id="dark-theme" defaultMessage="Dark" />
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
