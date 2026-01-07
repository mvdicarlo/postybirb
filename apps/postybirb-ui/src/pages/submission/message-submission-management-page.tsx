import { Trans, useLingui } from '@lingui/react/macro';
import {
  ActionIcon,
  Box,
  Loader,
  Space,
  Stack,
  TextInput,
} from '@mantine/core';
import { SubmissionType } from '@postybirb/types';
import {
  IconCalendar,
  IconLogs,
  IconMessage,
  IconPlus,
  IconTemplate,
} from '@tabler/icons-react';
import { useState } from 'react';
import submissionsApi from '../../api/submission.api';
import { PageHeader } from '../../components/page-header/page-header';
import { SubmissionTemplateView } from '../../components/submission-templates/submission-template-view/submission-template-view';
import { SubmissionHistoryView } from '../../components/submissions/submission-history-view/submission-history-view';
import { SubmissionScheduleView } from '../../components/submissions/submission-schedule-view/submission-schedule-view';
import { SubmissionView } from '../../components/submissions/submission-view/submission-view';
import { SubmissionStore } from '../../stores/submission.store';
import { useStore } from '../../stores/use-store';
import { CommonTranslations } from '../../translations/common-translations';

function isValidName(name: string): boolean {
  if (name && name.trim().length) {
    return true;
  }

  return false;
}

function createNewMessageSubmission(name: string) {
  return submissionsApi.createMessageSubmission(name);
}

function CreateMessageSubmissionForm(): JSX.Element {
  const [value, setValue] = useState('');
  const { t } = useLingui();

  return (
    <TextInput
      w="100%"
      size="md"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      error={value.length && !isValidName(value)}
      label={<Trans>Create Message Submission</Trans>}
      placeholder={t`Enter a name for the new message submission`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && isValidName(value)) {
          createNewMessageSubmission(value).then(() => setValue(''));
        }
      }}
      rightSection={
        <ActionIcon
          disabled={!isValidName(value)}
          onClick={() =>
            createNewMessageSubmission(value).then(() => setValue(''))
          }
        >
          <IconPlus />
        </ActionIcon>
      }
    />
  );
}

const TYPE = SubmissionType.MESSAGE;

export default function MessageSubmissionManagementPage() {
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
        <CreateMessageSubmissionForm />
        <SubmissionView submissions={fileSubmissions} type={TYPE} />
      </>
    );
  } else if (activeTab === 'templates') {
    display = <SubmissionTemplateView type={TYPE} />;
  } else if (activeTab === 'history') {
    display = <SubmissionHistoryView type={TYPE} />;
  } else if (activeTab === 'schedule') {
    display = <SubmissionScheduleView type={TYPE} />;
  }

  return (
    <>
      <PageHeader
        icon={<IconMessage />}
        title={<CommonTranslations.MessageSubmission />}
        tabs={[
          {
            label: <CommonTranslations.MessageSubmission />,
            key: 'submissions',
            icon: <IconMessage />,
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
