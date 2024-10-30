import { Trans } from '@lingui/macro';
import { Box, Button, Loader, Space } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ISubmissionDto, ScheduleType, SubmissionType } from '@postybirb/types';
import {
  IconCalendar,
  IconCalendarCancel,
  IconCancel,
  IconFile,
  IconMessage,
  IconSend,
  IconTemplate,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router';
import postApi from '../../api/post.api';
import submissionApi from '../../api/submission.api';
import websiteOptionsApi from '../../api/website-options.api';
import { PageHeader } from '../../components/page-header/page-header';
import TemplatePickerModal from '../../components/submission-templates/template-picker-modal/template-picker-modal';
import { SubmissionEditForm } from '../../components/submissions/submission-edit-form/submission-edit-form';
import { SubmissionDto } from '../../models/dtos/submission.dto';
import { SubmissionTemplateStore } from '../../stores/submission-template.store';
import { SubmissionStore } from '../../stores/submission.store';
import { useStore } from '../../stores/use-store';
import { FileSubmissionPath, MessageSubmissionPath } from '../route-paths';

function ScheduleAction({ submission }: { submission: SubmissionDto }) {
  if (submission.schedule.scheduleType === ScheduleType.NONE) {
    return null;
  }

  if (submission.isScheduled) {
    return (
      <Button
        disabled={!submission.isQueued()}
        variant="subtle"
        c="red"
        leftSection={<IconCalendarCancel />}
        onClick={() => {
          submissionApi.update(submission.id, {
            metadata: submission.metadata,
            ...submission.schedule,
            isScheduled: false,
            newOrUpdatedOptions: [],
            deletedWebsiteOptions: [],
          });
        }}
      >
        <Trans>Unschedule</Trans>
      </Button>
    );
  }

  const hasValidationIssues = submission.validations.some(
    (v) => v.errors && v.errors.length > 0,
  );
  const hasOptions = submission.options.filter((o) => !o.isDefault).length > 0;
  const canSetForPosting =
    hasOptions && !hasValidationIssues && !submission.isQueued();
  return (
    <Button
      disabled={!hasOptions || hasValidationIssues || submission.isQueued()}
      variant="subtle"
      c={canSetForPosting ? 'teal' : 'grey'}
      leftSection={<IconCalendar />}
      onClick={() => {
        submissionApi
          .update(submission.id, {
            metadata: submission.metadata,
            ...submission.schedule,
            isScheduled: true,
            newOrUpdatedOptions: [],
            deletedWebsiteOptions: [],
          })
          .then(() => {
            notifications.show({
              color: 'green',
              message: <Trans>Submission scheduled</Trans>,
            });
          })
          .catch((err) => {
            notifications.show({
              title: <Trans>Failed to schedule submission</Trans>,
              message: err.message,
              color: 'red',
            });
          });
      }}
    >
      <Trans>Schedule</Trans>
    </Button>
  );
}

function ApplyTemplateAction({ submission }: { submission: SubmissionDto }) {
  const [templatePickerVisible, setTemplatePickerVisible] = useState(false);
  const picker = templatePickerVisible ? (
    <TemplatePickerModal
      type={submission.type}
      submissionId={submission.id}
      onClose={() => setTemplatePickerVisible(false)}
      onApply={(options) => {
        setTemplatePickerVisible(false);
        Promise.all(
          options.map((option) =>
            websiteOptionsApi.create({
              submission: submission.id,
              account: option.account,
              data: option.data,
            }),
          ),
        )
          .then(() => {
            notifications.show({
              color: 'green',
              title: submission.getDefaultOptions().data.title,
              message: <Trans>Template applied</Trans>,
            });
          })
          .catch((err) => {
            notifications.show({
              color: 'red',
              title: submission.getDefaultOptions().data.title,
              message: err.message,
            });
          });
      }}
    />
  ) : null;
  return (
    <>
      <Button
        variant="subtle"
        leftSection={<IconTemplate />}
        onClick={() => setTemplatePickerVisible(true)}
      >
        <Trans>Apply Template</Trans>
      </Button>
      {picker}
    </>
  );
}

function PostAction({ submission }: { submission: SubmissionDto }) {
  if (submission.isQueued()) {
    return (
      <Button
        disabled={!submission.isQueued()}
        variant="subtle"
        c="red"
        leftSection={<IconCancel />}
        onClick={() => {
          postApi.dequeue([submission.id]);
        }}
      >
        <Trans>Cancel</Trans>
      </Button>
    );
  }

  const hasValidationIssues = submission.validations.some(
    (v) => v.errors && v.errors.length > 0,
  );
  const hasOptions = submission.options.filter((o) => !o.isDefault).length > 0;
  const canSetForPosting =
    hasOptions && !hasValidationIssues && !submission.isQueued();

  return (
    <Button
      disabled={!hasOptions || hasValidationIssues || submission.isQueued()}
      variant="subtle"
      c={canSetForPosting ? 'teal' : 'grey'}
      leftSection={<IconSend />}
      onClick={() => {
        postApi
          .enqueue([submission.id])
          .then(() => {
            notifications.show({
              message: <Trans>Submission queued</Trans>,
              color: 'green',
            });
          })
          .catch((err) => {
            notifications.show({
              title: <Trans>Failed to queue submission</Trans>,
              message: err.message,
              color: 'red',
            });
          });
      }}
    >
      <Trans>Post</Trans>
    </Button>
  );
}

export function EditSubmissionPage() {
  const { id } = useParams();
  const { state: submissions, isLoading } = useStore(SubmissionStore);
  const { state: templates, isLoading: isLoadingTemplates } = useStore(
    SubmissionTemplateStore,
  );

  const data = [...submissions, ...templates].find((s) => s.id === id);
  const submission = useMemo(
    () => data ?? new SubmissionDto({} as ISubmissionDto),
    [data],
  );

  const defaultOption = submission.getDefaultOptions();
  const { type } = submission;
  const isFile = type === SubmissionType.FILE;

  if (isLoading || isLoadingTemplates) {
    return <Loader />;
  }

  return (
    <>
      <PageHeader
        icon={isFile ? <IconFile /> : <IconMessage />}
        title={defaultOption.data.title ?? submission.id}
        breadcrumbs={[
          {
            text: isFile ? (
              <Trans>File Submissions</Trans>
            ) : (
              <Trans>Message Submissions</Trans>
            ),
            target: isFile ? FileSubmissionPath : MessageSubmissionPath,
          },
          { text: defaultOption.data.title ?? submission.id, target: '#' },
        ]}
        actions={[
          <ScheduleAction submission={submission} key="schedule-action" />,
          <PostAction submission={submission} key="post-action" />,
          <ApplyTemplateAction submission={submission} key="template-action" />,
        ]}
      />
      <Space h="md" />
      <Box className="postybirb__submission-edit-page" mx="5%">
        <SubmissionEditForm submission={submission} />
      </Box>
    </>
  );
}
