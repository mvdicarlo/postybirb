import { EuiPage } from '@elastic/eui';
import { EuiPageSideBar } from '@elastic/eui';

export default function AppLayout() {
  return (
    <EuiPage paddingSize="none">
      <EuiPageSideBar sticky></EuiPageSideBar>
    </EuiPage>
  );
}
