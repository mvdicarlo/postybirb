import { Trans } from '@lingui/macro';
import { Box, Button, Loader, Space } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ISubmissionDto, SubmissionType } from '@postybirb/types';
import { IconFile, IconMessage, IconTemplate } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router';
import websiteOptionsApi from '../../api/website-options.api';
import { PageHeader } from '../../components/page-header/page-header';
import TemplatePickerModal from '../../components/submission-templates/template-picker-modal/template-picker-modal';
import { SubmissionEditForm } from '../../components/submissions/submission-edit-form/submission-edit-form';
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
              submission: submission.id,
              account: option.account,
              data: option.data,
            })
          )
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

export function MultiEditSubmissionPage() {
  const { type } = useParams<{ type: string }>();
  const { state: submissions, isLoading } = useStore(MultiSubmissionStore);

  // The multi-submission is mapped by type, so we can just find the submission by type
  const data = submissions.find((s) => s.type === type);
  const submission = useMemo(
    () => data ?? new SubmissionDto({} as ISubmissionDto),
    [data]
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
        ]}
      />
      <Space h="md" />
      <Box className="postybirb__submission-edit-page" mx="5%">
        <SubmissionEditForm submission={submission} />
      </Box>
    </>
  );
}
