import { EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from 'react-intl';
import Uploader from '../../components/shared/uploader/uploader';

export default function SubmissionManagementPage() {
  return (
    <>
      <EuiPageHeader
        bottomBorder
        iconType="documents"
        pageTitle={
          <FormattedMessage
            id="submissions.page-header"
            defaultMessage="Submissions"
          />
        }
      />
      <EuiSpacer />
      <div>
        <Uploader />
      </div>
    </>
  );
}
