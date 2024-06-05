import {
  EuiPageHeader,
  EuiProgress,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { Trans } from '@lingui/macro';
import { Loader, Space, Stack } from '@mantine/core';
import { SubmissionType } from '@postybirb/types';
import { IconFile, IconTemplate } from '@tabler/icons-react';
import { useState } from 'react';
import { PageHeader } from '../../components/page-header/page-header';
import { FileIcon } from '../../components/shared/icons/Icons';
import Uploader from '../../components/shared/uploader/uploader';
import SubmissionTemplateManagementView from '../../components/submission-templates/submission-template-management-view/submission-template-management-view';
import DirectoryWatchersTable from '../../components/submissions/directory-watchers-table/directory-watchers-table';
import { SubmissionTable } from '../../components/submissions/submission-table/submission-table';
import { SubmissionUploader } from '../../components/submissions/submission-uploader/submission-uploader';
import { SubmissionView } from '../../components/submissions/submission-view/submission-view';
import { SubmissionStore } from '../../stores/submission.store';
import { useStore } from '../../stores/use-store';

export function FileSubmissionManagementPage2() {
  const { state, isLoading } = useStore(SubmissionStore);
  const [activeTab, setActiveTab] = useState<string>('submissions');
  const fileSubmissions = state.filter(
    (submission) => submission.type === SubmissionType.FILE
  );

  if (isLoading) {
    return <Loader />;
  }

  let display = null;
  if (activeTab === 'submissions') {
    display = (
      <SubmissionView
        submissions={fileSubmissions}
        type={SubmissionType.FILE}
      />
    );
  } else if (activeTab === 'templates') {
    display = null;
  } else if (activeTab === 'file-watcher') {
    display = null;
  }

  return (
    <>
      <PageHeader
        icon={<IconFile />}
        title={<Trans>File Submissions</Trans>}
        tabs={[
          {
            label: <Trans>Submissions</Trans>,
            key: 'submissions',
            icon: <IconFile />,
          },
          {
            label: <Trans>Templates</Trans>,
            key: 'templates',
            icon: <IconTemplate />,
          },
          {
            label: <Trans>Auto Importers (File Watcher)</Trans>,
            key: 'file-watcher',
            icon: <IconTemplate />,
          },
        ]}
        onTabChange={setActiveTab}
      />
      <Space h="md" />
      <Stack>
        <SubmissionUploader key="submission-uploader" />
        {display}
      </Stack>
    </>
  );
}

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
