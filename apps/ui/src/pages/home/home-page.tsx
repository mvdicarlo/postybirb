import { EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from 'react-intl';
import { HomeIcon } from '../../shared/icons/Icons';

export default function HomePage() {
  return (
    <>
      <EuiPageHeader
        bottomBorder
        iconType={HomeIcon.Header}
        pageTitle={
          <FormattedMessage id="home.page-header" defaultMessage="Home" />
        }
      />
      <EuiSpacer />
    </>
  );
}
