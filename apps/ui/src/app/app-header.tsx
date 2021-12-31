import {
  EuiHeader,
  EuiHeaderLogo,
  EuiHeaderSectionItem,
  EuiButtonIcon,
} from '@elastic/eui';
import { useContext } from 'react';
import { AppThemeContext } from './app-theme-provider';

type AppHeaderProps = {
  onMenuClick: () => void;
};

export default function AppHeader(props: AppHeaderProps) {
  const [theme, setTheme] = useContext(AppThemeContext);
  return (
    <EuiHeader>
      <EuiHeaderSectionItem>
        <EuiButtonIcon
          iconType="menu"
          color="ghost"
          aria-label="menu"
          onClick={props.onMenuClick}
        />
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
      <EuiHeaderSectionItem>Test</EuiHeaderSectionItem>
    </EuiHeader>
  );
}
