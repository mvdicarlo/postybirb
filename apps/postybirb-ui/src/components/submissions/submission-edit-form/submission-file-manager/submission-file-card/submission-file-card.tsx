import { Box, Flex, Paper } from '@mantine/core';
import {
  FileSubmissionMetadata,
  FileType,
  ISubmissionFileDto,
} from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import { SubmissionDto } from '../../../../../models/dtos/submission.dto';
import { FileCardDeleteAction } from './file-card-delete-action';
import { FileCardFileActions } from './file-card-file-actions';
import { FileMetadataManager } from './file-metadata-manager';
import { FileTextAlt } from './file-text-alt';
import { FileValidations } from './file-validations';

export const DRAGGABLE_SUBMISSION_FILE_CLASS_NAME = 'sortable-file';

export function SubmissionFileCard({
  file,
  draggable,
  totalFiles,
  submission,
}: {
  submission: SubmissionDto;
  file: ISubmissionFileDto;
  draggable: boolean;
  totalFiles: number;
}) {
  const metadata = submission.metadata as FileSubmissionMetadata;
  return (
    <Paper
      key={file.id}
      p="sm"
      style={{
        borderRadius: 4,
        cursor: draggable ? 'grab' : undefined,
      }}
      className={DRAGGABLE_SUBMISSION_FILE_CLASS_NAME}
    >
      <Flex gap="xl" key="card-file-previewer">
        <FileCardFileActions file={file} submissionId={submission.id} />
        <Box flex={10}>
          <FileValidations submission={submission} file={file} />
          <FileMetadataManager file={file} metadata={metadata} />
          {getFileType(file.fileName) === FileType.TEXT ? (
            <Box mt="md" style={{ position: 'relative' }}>
              <FileTextAlt file={file} />
            </Box>
          ) : null}
        </Box>
        <Box flex={0}>
          <FileCardDeleteAction
            submissionId={submission.id}
            file={file}
            totalFiles={totalFiles}
          />
        </Box>
      </Flex>
    </Paper>
  );
}
