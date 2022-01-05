import {
  EuiHeader,
  EuiHeaderLogo,
  EuiHeaderSectionItem,
  EuiHeaderSectionItemButton,
  EuiIcon,
} from '@elastic/eui';
import { useContext, useState } from 'react';
import { useKeybinding } from '../components/app/keybinding/keybinding';
import AppSettings from './app-settings';
import { AppThemeContext } from './app-theme-provider';

type AppHeaderProps = {
  onMenuClick: () => void;
};

export default function AppHeader(props: AppHeaderProps) {
  const [theme, setTheme] = useContext(AppThemeContext);
  const [isFlyoutOpen, setFlyoutOpen] = useState<boolean>(false);

  const toggleFlyout = () => {
    setFlyoutOpen(!isFlyoutOpen);
    props.onMenuClick();
  };

  useKeybinding({
    onActivate: toggleFlyout,
    keybinding: 'Alt+A',
  });

  return (
    <EuiHeader theme="default" style={{ backgroundColor: '#07C' }}>
      <EuiHeaderSectionItem>
        <EuiHeaderSectionItemButton
          aria-haspopup="true"
          aria-aria-expanded={isFlyoutOpen}
          aria-label="Sidebar opener"
          isSelected={isFlyoutOpen}
          onClick={toggleFlyout}
        >
          <EuiIcon type="menu" title="Shortcut: Alt+A" />
        </EuiHeaderSectionItemButton>
        <EuiHeaderLogo
          iconTitle="PostyBirb"
          iconType={() => (
            <img
              className="euiIcon euiIcon--large euiHeaderLogo__icon"
              src="/assets/app-icon.png"
            />
          )}
        >
          PostyBirb{' '}
          <span className="text-xs">{window.electron.app_version}</span>
        </EuiHeaderLogo>
      </EuiHeaderSectionItem>
      <EuiHeaderSectionItem>
        <AppSettings />
      </EuiHeaderSectionItem>
    </EuiHeader>
  );
}
