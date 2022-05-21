import { EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from 'react-intl';
import Uploader from '../../components/shared/uploader/uploader';

export default function Home() {
  return (
    <>
      <EuiPageHeader
        bottomBorder
        iconType="home"
        pageTitle={
          <FormattedMessage id="home.page-header" defaultMessage="Home" />
        }
      />
      <EuiSpacer />
      <Uploader />
    </>
  );
}
