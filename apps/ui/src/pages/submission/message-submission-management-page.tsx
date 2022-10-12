import { EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from 'react-intl';
import { MessageIcon } from '../../shared/icons/Icons';

export default function MessageSubmissionManagementPage() {
  return (
    <>
      <EuiPageHeader
        bottomBorder
        iconType={MessageIcon.Header}
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
