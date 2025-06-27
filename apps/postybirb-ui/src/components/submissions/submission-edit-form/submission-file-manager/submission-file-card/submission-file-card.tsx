import { Box, Divider, Flex, Paper } from '@mantine/core';
import {
  FileSubmissionMetadata,
  FileType,
  ISubmissionFileDto,
  NULL_ACCOUNT_ID,
} from '@postybirb/types';
import { getFileType } from '@postybirb/utils/file-type';
import { IconGripVertical } from '@tabler/icons-react';
import { SubmissionDto } from '../../../../../models/dtos/submission.dto';
import { FileCardDeleteAction } from './file-card-delete-action';
import { FileCardFileActions } from './file-card-file-actions';
import { FileMetadataManager } from './file-metadata-manager/file-metadata-manager';
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
      p="md"
      shadow="sm"
      radius="md"
      withBorder
      style={{
        cursor: draggable ? 'grab' : undefined,
        position: 'relative',
        overflow: 'visible',
      }}
      className={DRAGGABLE_SUBMISSION_FILE_CLASS_NAME}
    >
      {draggable && (
        <Box
          style={{
            position: 'absolute',
            left: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            opacity: 0.5,
            cursor: 'grab',
          }}
        >
          <IconGripVertical size={18} />
        </Box>
      )}

      <Flex gap="xl" align="flex-start" key="card-file-previewer">
        <Box
          style={{
            // eslint-disable-next-line lingui/no-unlocalized-strings
            flex: '0 0 auto',
            padding: '4px',
            borderRadius: '8px',
            background: 'var(--mantine-color-dark-6)',
          }}
        >
          <FileCardFileActions file={file} submissionId={submission.id} />
        </Box>

        <Box style={{ flex: 1 }}>
          <FileValidations submission={submission} file={file} />

          <Divider my="sm" variant="dashed" />

          <FileMetadataManager
            submissionId={submission.id}
            file={file}
            metadata={metadata}
            accounts={submission.options
              .map((option) => option.account)
              .filter((account) => account.id !== NULL_ACCOUNT_ID)}
          />

          {getFileType(file.fileName) === FileType.TEXT ? (
            <Box mt="md" style={{ position: 'relative' }}>
              <Divider my="sm" variant="dashed" />
              <FileTextAlt file={file} />
            </Box>
          ) : null}
        </Box>

        <Box style={{ alignSelf: 'flex-start' }}>
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
