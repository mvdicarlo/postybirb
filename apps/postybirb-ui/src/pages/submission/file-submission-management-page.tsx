import {
  EuiPageHeader,
  EuiProgress,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { Trans } from '@lingui/macro';
import { SubmissionType } from '@postybirb/types';
import { useState } from 'react';
import { FileIcon } from '../../components/shared/icons/Icons';
import Uploader from '../../components/shared/uploader/uploader';
import SubmissionTemplateManagementView from '../../components/submission-templates/submission-template-management-view/submission-template-management-view';
import DirectoryWatchersTable from '../../components/submissions/directory-watchers-table/directory-watchers-table';
import { SubmissionTable } from '../../components/submissions/submission-table/submission-table';
import { SubmissionStore } from '../../stores/submission.store';
import { useStore } from '../../stores/use-store';

export default function FileSubmissionManagementPage() {
  const { euiTheme } = useEuiTheme();
  const { state, isLoading } = useStore(SubmissionStore);
  const [tab, setTab] = useState<'submissions' | 'templates'>('submissions');
  const fileSubmissions = state.filter(
    (submission) => submission.type === SubmissionType.FILE
  );

  const display =
    tab === 'submissions' ? (
      <>
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
    ) : (
      <SubmissionTemplateManagementView type={SubmissionType.FILE} />
    );

  return (
    <>
      <EuiPageHeader
        css={{ background: euiTheme.colors.body }}
        bottomBorder
        iconType={FileIcon.Header}
        pageTitle={<Trans>File Submissions</Trans>}
        tabs={[
          {
            label: <Trans>Submissions</Trans>,
            isSelected: tab === 'submissions',
            onClick: () => {
              setTab('submissions');
            },
          },
          {
            label: <Trans>Templates</Trans>,
            isSelected: tab === 'templates',
            onClick: () => {
              setTab('templates');
            },
          },
        ]}
      />
      <EuiSpacer />
      {display}
    </>
  );
}
