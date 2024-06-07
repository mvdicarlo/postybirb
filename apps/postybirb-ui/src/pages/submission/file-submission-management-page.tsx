import { Trans } from '@lingui/macro';
import { Loader, Space, Stack } from '@mantine/core';
import { SubmissionType } from '@postybirb/types';
import { IconFile, IconTemplate } from '@tabler/icons-react';
import { useState } from 'react';
import { PageHeader } from '../../components/page-header/page-header';
import { SubmissionUploader } from '../../components/submissions/submission-uploader/submission-uploader';
import { SubmissionView } from '../../components/submissions/submission-view/submission-view';
import { SubmissionStore } from '../../stores/submission.store';
import { useStore } from '../../stores/use-store';

export function FileSubmissionManagementPage() {
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
