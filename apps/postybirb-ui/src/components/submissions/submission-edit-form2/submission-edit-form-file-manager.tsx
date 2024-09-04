import { Box, Space } from '@mantine/core';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { SubmissionUploader } from '../submission-uploader/submission-uploader';

type SubmissionEditFormFileManagerProps = {
  submission: SubmissionDto;
};

export function SubmissionEditFormFileManager(
  props: SubmissionEditFormFileManagerProps
) {
  const { submission } = props;
  return (
    <Box>
      <Space h="md" />
      <SubmissionUploader appendToSubmission={submission} />
    </Box>
  );
}
