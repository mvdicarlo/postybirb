import {
  EuiPageHeader,
  EuiProgress,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { SubmissionType } from '@postybirb/types';
import { FormattedMessage } from 'react-intl';
import { FileIcon } from '../../components/shared/icons/Icons';
import Uploader from '../../components/shared/uploader/uploader';
import DirectoryWatchersTable from '../../components/submissions/directory-watchers-table/directory-watchers-table';
import { SubmissionTable } from '../../components/submissions/submission-table/submission-table';
import { SubmissionStore } from '../../stores/submission.store';
import { useStore } from '../../stores/use-store';

export default function FileSubmissionManagementPage() {
  const { euiTheme } = useEuiTheme();
  const { state, isLoading } = useStore(SubmissionStore);

  const fileSubmissions = state.filter(
    (submission) => submission.type === SubmissionType.FILE
  );

  return (
    <>
      <EuiPageHeader
        css={{ background: euiTheme.colors.body }}
        bottomBorder
        iconType={FileIcon.Header}
        pageTitle={
          <FormattedMessage
            id="submissions.file-page-header"
            defaultMessage="File Submissions"
          />
        }
      />
      <EuiSpacer />
      <Uploader endpointPath="api/submission" />
      <EuiSpacer />
      <DirectoryWatchersTable />
      <EuiSpacer />
      {isLoading ? (
        <EuiProgress size="xs" />
      ) : (
        <SubmissionTable submissions={fileSubmissions} />
      )}
    </>
  );
}
