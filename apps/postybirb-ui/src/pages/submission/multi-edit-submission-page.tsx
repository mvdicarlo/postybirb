import { Trans } from '@lingui/macro';
import { Box, Button, Loader, Radio, Space } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ISubmissionDto, SubmissionType } from '@postybirb/types';
import {
  IconDeviceFloppy,
  IconFile,
  IconMessage,
  IconTemplate,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router';
import submissionApi from '../../api/submission.api';
import websiteOptionsApi from '../../api/website-options.api';
import { PageHeader } from '../../components/page-header/page-header';
import TemplatePickerModal from '../../components/submission-templates/template-picker-modal/template-picker-modal';
import { SubmissionEditForm } from '../../components/submissions/submission-edit-form/submission-edit-form';
import { SubmissionPickerModal } from '../../components/submissions/submission-picker/submission-picker-modal';
import { SubmissionDto } from '../../models/dtos/submission.dto';
import { MultiSubmissionStore } from '../../stores/multi-submission.store';
import { useStore } from '../../stores/use-store';
import { FileSubmissionPath, MessageSubmissionPath } from '../route-paths';

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
              submissionId: submission.id,
              accountId: option.accountId,
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

function ApplyMultiSubmissionAction({
  submission,
}: {
  submission: SubmissionDto;
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [mergeMode, setMergeMode] = useState('1');
  const picker = modalVisible ? (
    <SubmissionPickerModal
      type={submission.type}
      onClose={() => setModalVisible(false)}
      onApply={(submissions) => {
        submissionApi
          .applyToMultipleSubmissions({
            submissionToApply: submission.id,
            submissionIds: submissions,
            merge: mergeMode === '1',
          })
          .then(() => {
            notifications.show({
              color: 'green',
              message: <Trans>Updates applied</Trans>,
            });
          })
          .catch((err) => {
            notifications.show({
              color: 'red',
              message: err.message,
            });
          });
        setModalVisible(false);
      }}
    >
      <Radio.Group
        name="multiSubmissionMergeMode"
        label={<Trans>Merge</Trans>}
        withAsterisk
        value={mergeMode}
        onChange={(value) => setMergeMode(value)}
      >
        <Radio
          value="1"
          label={
            <Trans>
              Overwrite overlapping website options only. This will keep any
              website options that already exist and only overwrite ones
              specified in the multi-update form.
            </Trans>
          }
        />
        <Radio
          value="0"
          label={
            <Trans>
              Only use website options specified and delete website options
              missing from multi-update form.
            </Trans>
          }
        />
      </Radio.Group>
    </SubmissionPickerModal>
  ) : null;
  return (
    <>
      <Button
        variant="subtle"
        leftSection={<IconDeviceFloppy />}
        onClick={() => setModalVisible(true)}
      >
        <Trans>Apply to Submissions</Trans>
      </Button>
      {picker}
    </>
  );
}

export function MultiEditSubmissionPage() {
  const { type } = useParams<{ type: string }>();
  const { state: submissions, isLoading } = useStore(MultiSubmissionStore);

  // The multi-submission is mapped by type, so we can just find the submission by type
  const data = submissions.find((s) => s.type === type);
  const submission = useMemo(
    () => data ?? new SubmissionDto({} as ISubmissionDto),
    [data],
  );

  const isFile = type === SubmissionType.FILE;

  if (isLoading) {
    return <Loader />;
  }

  return (
    <>
      <PageHeader
        icon={isFile ? <IconFile /> : <IconMessage />}
        title={<Trans>Edit Multiple</Trans>}
        breadcrumbs={[
          {
            text: isFile ? (
              <Trans>File Submissions</Trans>
            ) : (
              <Trans>Message Submissions</Trans>
            ),
            target: isFile ? FileSubmissionPath : MessageSubmissionPath,
          },
          { text: submission.type, target: '#' },
        ]}
        actions={[
          <ApplyTemplateAction submission={submission} key="template-action" />,
          <ApplyMultiSubmissionAction
            submission={submission}
            key="multi-submission-action"
          />,
        ]}
      />
      <Space h="md" />
      <Box className="postybirb__submission-edit-page" mx="5%">
        <SubmissionEditForm submission={submission} />
      </Box>
    </>
  );
}
