import { EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { SubmissionType } from '@postybirb/types';
import { FormattedMessage } from 'react-intl';
import Uploader from '../../components/shared/uploader/uploader';
import { SubmissionTable } from '../../components/submissions/submission-table/submission-table';
import { SubmissionStore } from '../../stores/submission.store';
import { useStore } from '../../stores/use-store';

export default function FileSubmissionManagementPage() {
  const { state } = useStore(SubmissionStore);

  const fileSubmissions = state.filter(
    (submission) => submission.type === SubmissionType.FILE
  );

  return (
    <>
      <EuiPageHeader
        bottomBorder
        iconType="documents"
        pageTitle={
          <FormattedMessage
            id="submissions.file-page-header"
            defaultMessage="File Submissions"
          />
        }
      />
      <EuiSpacer />
      <Uploader />
      <EuiSpacer />
      <SubmissionTable submissions={fileSubmissions} />
    </>
  );
}
