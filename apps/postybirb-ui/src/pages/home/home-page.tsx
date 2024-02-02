import { EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { Trans } from '@lingui/macro';
import { HomeIcon } from '../../components/shared/icons/Icons';

export default function HomePage() {
  return (
    <>
      <EuiPageHeader
        bottomBorder
        iconType={HomeIcon.Header}
        pageTitle={<Trans comment="Home page header">Home</Trans>}
      />
      <EuiSpacer />
    </>
  );
}
