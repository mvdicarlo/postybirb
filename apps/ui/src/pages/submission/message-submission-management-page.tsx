import { EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from 'react-intl';

export default function MessageSubmissionManagementPage() {
  return (
    <>
      <EuiPageHeader
        bottomBorder
        iconType="quote"
        pageTitle={
          <FormattedMessage
            id="submissions.message-page-header"
            defaultMessage="Message Submissions"
          />
        }
      />
      <EuiSpacer />
    </>
  );
}
