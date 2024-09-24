import { Box, ScrollArea, Space, Stack } from '@mantine/core';
import { FileSubmissionMetadata, ISubmissionFileDto } from '@postybirb/types';
import { useEffect, useRef, useState } from 'react';
import Sortable from 'sortablejs';
import submissionApi from '../../../../api/submission.api';
import { SubmissionDto } from '../../../../models/dtos/submission.dto';
import { SubmissionUploader } from '../../submission-uploader/submission-uploader';
import {
  DRAGGABLE_SUBMISSION_FILE_CLASS_NAME,
  SubmissionFileCard,
} from './submission-file-card/submission-file-card';

type SubmissionEditFormFileManagerProps = {
  submission: SubmissionDto<FileSubmissionMetadata>;
};

function orderFiles(
  submission: SubmissionDto<FileSubmissionMetadata>
): ISubmissionFileDto[] {
  const { metadata, files } = submission;
  const { order } = metadata;

  const orderedFiles: ISubmissionFileDto[] = Array(order.length);
  files.forEach((file) => {
    const index = order.findIndex((id) => id === file.id);
    if (index > -1) {
      orderedFiles[index] = file;
    }
  });

  return orderedFiles.filter((f) => !!f);
}

function FileView({ submission }: SubmissionEditFormFileManagerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [orderedFiles, setOrderedFiles] = useState(orderFiles(submission));
  useEffect(() => {
    setOrderedFiles(orderFiles(submission));
  }, [submission]);
  useEffect(() => {
    const el = ref.current;
    // No sort for only 1 file
    if (orderedFiles.length <= 1) {
      return () => {};
    }

    if (!el) {
      // eslint-disable-next-line lingui/no-unlocalized-strings, no-console
      console.warn('Could not find sortable element');
      return () => {};
    }
    const sortable = new Sortable(el, {
      disabled: orderedFiles.length <= 1,
      draggable: `.${DRAGGABLE_SUBMISSION_FILE_CLASS_NAME}`,
      direction: 'vertical',
      onEnd: (event) => {
        if (
          event.oldIndex !== undefined &&
          event.newIndex !== undefined &&
          event.newDraggableIndex !== undefined &&
          event.oldIndex !== event.newIndex
        ) {
          const newOrderedFiles = [...orderedFiles];
          const [movedFile] = newOrderedFiles.splice(
            event.oldDraggableIndex!,
            1
          );
          newOrderedFiles.splice(event.newDraggableIndex, 0, movedFile);
          // eslint-disable-next-line no-param-reassign
          submission.metadata.order = newOrderedFiles.map((f) => f.id);
          setOrderedFiles(newOrderedFiles);
          submissionApi.update(submission.id, {
            metadata: submission.metadata,
          });
        }
      },
    });
    return () => {
      try {
        sortable.destroy();
      } catch (e) {
        // eslint-disable-next-line no-console, lingui/no-unlocalized-strings
        console.error('Failed to destroy sortable', e);
      }
    };
  }, [orderedFiles, ref, submission]);

  return (
    <ScrollArea
      flex="7"
      h={submission.files.length * 150}
      bg="var(--mantine-color-dark-filled)"
      p="md"
      style={{ borderRadius: 'var(--mantine-radius-md)' }}
    >
      <Stack id="submission-file-view" ref={ref}>
        {orderedFiles.map((file) => (
          <SubmissionFileCard
            key={`${file.id}:${file.hash}`}
            file={file}
            draggable={orderedFiles.length > 1}
            metadata={submission.metadata}
            submissionId={submission.id}
            totalFiles={orderedFiles.length}
          />
        ))}
      </Stack>
    </ScrollArea>
  );
}

export function SubmissionFileManager(
  props: SubmissionEditFormFileManagerProps
) {
  const { submission } = props;
  return (
    <Box>
      <FileView submission={submission} />
      <Space h="md" />
      <SubmissionUploader appendToSubmission={submission} />
    </Box>
  );
}
