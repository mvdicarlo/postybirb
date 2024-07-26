import { Trans } from '@lingui/macro';
import { Box, Loader, Space } from '@mantine/core';
import { ISubmissionDto, SubmissionType } from '@postybirb/types';
import { IconFile, IconMessage } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useParams } from 'react-router';
import { PageHeader } from '../../components/page-header/page-header';
import { SubmissionEditForm2 } from '../../components/submissions/submission-edit-form2/submission-edit-form2';
import { SubmissionDto } from '../../models/dtos/submission.dto';
import { SubmissionTemplateStore } from '../../stores/submission-template.store';
import { SubmissionStore } from '../../stores/submission.store';
import { useStore } from '../../stores/use-store';
import { FileSubmissionPath, MessageSubmissionPath } from '../route-paths';

export function EditSubmissionPage2() {
  const { id } = useParams();
  const { state: submissions, isLoading } = useStore(SubmissionStore);
  const { state: templates, isLoading: isLoadingTemplates } = useStore(
    SubmissionTemplateStore
  );

  const data = [...submissions, ...templates].find((s) => s.id === id);
  const submission = useMemo(
    () => data ?? new SubmissionDto({} as ISubmissionDto),
    [data]
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
      />
      <Space h="md" />
      <Box className="postybirb__submission-edit-page">
        <SubmissionEditForm2 submission={submission} />
      </Box>
    </>
  );
}
