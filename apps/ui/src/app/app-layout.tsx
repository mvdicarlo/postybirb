import { EuiPage } from '@elastic/eui/src/components/page/page';
import { EuiPageSideBar } from '@elastic/eui/src/components/page/page_side_bar/page_side_bar';

export default function AppLayout() {
  return (
    <EuiPage paddingSize="none">
      <EuiPageSideBar sticky></EuiPageSideBar>
    </EuiPage>
  );
}
