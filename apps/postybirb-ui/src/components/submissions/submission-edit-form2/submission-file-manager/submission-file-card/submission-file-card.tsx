import { Box, Flex, Paper } from '@mantine/core';
import {
  FileSubmissionMetadata,
  ISubmissionFileDto,
  SubmissionId,
} from '@postybirb/types';
import { FileCardDeleteAction } from './file-card-delete-action';
import { FileCardFileActions } from './file-card-file-actions';
import { FileMetadataManager } from './file-metadata-manager';

export const DRAGGABLE_SUBMISSION_FILE_CLASS_NAME = 'sortable-file';

export function SubmissionFileCard({
  file,
  draggable,
  metadata,
  totalFiles,
  submissionId,
}: {
  submissionId: SubmissionId;
  file: ISubmissionFileDto;
  draggable: boolean;
  metadata: FileSubmissionMetadata;
  totalFiles: number;
}) {
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
        <FileCardFileActions file={file} submissionId={submissionId} />
        <Box flex={10}>
          <FileMetadataManager file={file} metadata={metadata} />
        </Box>
        <Box flex={0}>
          <FileCardDeleteAction
            submissionId={submissionId}
            file={file}
            totalFiles={totalFiles}
          />
        </Box>
      </Flex>
    </Paper>
  );
}
