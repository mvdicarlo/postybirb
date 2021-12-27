import { EuiButton, EuiPage, EuiPageContent, EuiPageContentBody } from '@elastic/eui';
import { EuiPageSideBar } from '@elastic/eui';

export default function AppLayout() {
  return (
    <EuiPage paddingSize="none" className="w-screen h-screen">
      <EuiPageSideBar sticky></EuiPageSideBar>
      <EuiPageContent
        hasBorder={false}
        hasShadow={false}
        paddingSize="none"
        borderRadius="none"
      >
        <EuiPageContentBody restrictWidth><EuiButton>Test</EuiButton></EuiPageContentBody>
      </EuiPageContent>
    </EuiPage>
  );
}
