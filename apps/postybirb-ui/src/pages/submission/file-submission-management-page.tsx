import { Trans } from '@lingui/react/macro';
import { Box, Loader, Space, Stack } from '@mantine/core';
import { SubmissionType } from '@postybirb/types';
import {
  IconCalendar,
  IconFile,
  IconFolderUp,
  IconLogs,
  IconTemplate,
} from '@tabler/icons-react';
import { useState } from 'react';
import { PageHeader } from '../../components/page-header/page-header';
import { SubmissionTemplateView } from '../../components/submission-templates/submission-template-view/submission-template-view';
import DirectoryWatchersView from '../../components/submissions/directory-watchers-view/directory-watchers-view';
import { SubmissionHistoryView } from '../../components/submissions/submission-history-view/submission-history-view';
import { SubmissionScheduleView } from '../../components/submissions/submission-schedule-view/submission-schedule-view';
import { SubmissionUploader } from '../../components/submissions/submission-uploader/submission-uploader';
import { SubmissionView } from '../../components/submissions/submission-view/submission-view';
import { SubmissionStore } from '../../stores/submission.store';
import { useStore } from '../../stores/use-store';
import { CommonTranslations } from '../../translations/common-translations';

const TYPE = SubmissionType.FILE;

export function FileSubmissionManagementPage() {
  const { state, isLoading } = useStore(SubmissionStore);
  const [activeTab, setActiveTab] = useState<string>('submissions');
  const fileSubmissions = state.filter(
    (submission) => submission.type === TYPE,
  );

  if (isLoading) {
    return <Loader />;
  }

  let display = null;
  if (activeTab === 'submissions') {
    display = (
      <>
        <SubmissionUploader key="submission-uploader" showTemplatePicker />
        <SubmissionView submissions={fileSubmissions} type={TYPE} />
      </>
    );
  } else if (activeTab === 'templates') {
    display = <SubmissionTemplateView type={TYPE} />;
  } else if (activeTab === 'file-watcher') {
    display = <DirectoryWatchersView />;
  } else if (activeTab === 'history') {
    display = <SubmissionHistoryView type={TYPE} />;
  } else if (activeTab === 'schedule') {
    display = <SubmissionScheduleView type={TYPE} />;
  }

  return (
    <>
      <PageHeader
        icon={<IconFile />}
        title={<CommonTranslations.FileSubmission />}
        tabs={[
          {
            label: <CommonTranslations.Submission />,
            key: 'submissions',
            icon: <IconFile />,
          },
          {
            label: <CommonTranslations.Schedule />,
            key: 'schedule',
            icon: <IconCalendar />,
          },
          {
            label: <CommonTranslations.Template />,
            key: 'templates',
            icon: <IconTemplate />,
          },
          {
            label: <Trans>Auto Importers</Trans>,
            key: 'file-watcher',
            icon: <IconFolderUp />,
          },
          { label: <Trans>History</Trans>, key: 'history', icon: <IconLogs /> },
        ]}
        onTabChange={setActiveTab}
      />
      <Space h="md" />
      <Box mx="5%">
        <Stack>{display}</Stack>
      </Box>
    </>
  );
}
