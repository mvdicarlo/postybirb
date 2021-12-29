import './app.css';
import {
  EuiPage,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageSideBar,
  EuiHeader,
  EuiHeaderLogo,
} from '@elastic/eui';

export default function AppLayout() {
  return (
    <>
      <EuiHeader>
        <EuiHeaderLogo
          iconTitle="PostyBirb"
          iconType={() => (
            <img
              className="euiIcon euiIcon--large euiHeaderLogo__icon"
              src="/assets/app-icon.png"
            />
          )}
        >
          PostyBirb
        </EuiHeaderLogo>
      </EuiHeader>
      <EuiPage paddingSize="none">
        <EuiPageSideBar sticky></EuiPageSideBar>
        <EuiPageContent
          hasBorder={false}
          hasShadow={false}
          paddingSize="none"
          borderRadius="none"
        >
          <EuiPageContentBody restrictWidth></EuiPageContentBody>
        </EuiPageContent>
      </EuiPage>
    </>
  );
}
