import { EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from 'react-intl';

export default function HomePage() {
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
    </>
  );
}
