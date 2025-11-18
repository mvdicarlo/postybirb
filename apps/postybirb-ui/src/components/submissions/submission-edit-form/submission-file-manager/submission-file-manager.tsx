import { Trans } from "@lingui/react/macro";
import {
  Box,
  Center,
  Group,
  Paper,
  ScrollArea,
  Space,
  Stack,
  Text,
} from '@mantine/core';
import { FileSubmissionMetadata, ISubmissionFileDto } from '@postybirb/types';
import { IconArrowsSort, IconFilePlus } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import Sortable from 'sortablejs';
import fileSubmissionApi from '../../../../api/file-submission.api';
import { draggableIndexesAreDefined } from '../../../../helpers/sortable.helper';
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
  submission: SubmissionDto<FileSubmissionMetadata>,
): ISubmissionFileDto[] {
  const { files } = submission;
  return files
    .filter((f) => !!f)
    .sort((a, b) => {
      const aOrder = a.order ?? Number.MAX_SAFE_INTEGER;
      const bOrder = b.order ?? Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder;
    });
}

function FileView({ submission }: SubmissionEditFormFileManagerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [orderedFiles, setOrderedFiles] = useState(orderFiles(submission));

  // Track file IDs to ensure reactivity when files are added/removed
  const fileIds = submission.files.map((f) => f.id).join(',');

  useEffect(() => {
    setOrderedFiles(orderFiles(submission));
  }, [submission, fileIds]);
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
          draggableIndexesAreDefined(event) &&
          event.oldIndex !== event.newIndex
        ) {
          // Create a copy of ordered files for manipulation
          const newOrderedFiles = [...orderedFiles];

          // Remove the moved file from its old position
          const [movedFile] = newOrderedFiles.splice(
            event.oldDraggableIndex,
            1,
          );

          // Insert the moved file at its new position
          newOrderedFiles.splice(event.newDraggableIndex, 0, movedFile);

          // Update order property for all files based on their new positions
          // Use the current timestamp as a base to ensure unique, sequential order values
          const baseOrder = Date.now();
          newOrderedFiles.forEach((file, index) => {
            // eslint-disable-next-line no-param-reassign
            file.order = baseOrder + index;
          });

          // Update local state immediately for responsive UI
          setOrderedFiles(newOrderedFiles);

          // Persist changes to backend
          fileSubmissionApi.reorder({
            order: newOrderedFiles.reduce(
              (acc: Record<string, number>, file) => {
                acc[file.id] = file.order ?? 0;
                return acc;
              },
              {},
            ),
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
    <Paper withBorder p={0} radius="md">
      <Box
        p="xs"
        bg="dark.6"
        style={{ borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}
      >
        <Group p="apart">
          <Text size="sm" fw={600} c="dimmed">
            <Trans>Submission Files</Trans> ({orderedFiles.length})
          </Text>
          {orderedFiles.length > 1 && (
            <Group gap="xs">
              <IconArrowsSort size={14} />
              <Text size="xs" c="dimmed">
                <Trans>Drag to reorder</Trans>
              </Text>
            </Group>
          )}
        </Group>
      </Box>

      <ScrollArea
        h={submission.files.length === 1 ? 'auto' : 350}
        p="md"
        offsetScrollbars
        scrollbarSize={6}
        type="auto"
      >
        {orderedFiles.length > 0 ? (
          <Stack id="submission-file-view" ref={ref} gap="md">
            {orderedFiles.map((file) => (
              <SubmissionFileCard
                key={`${file.id}:${file.hash}`}
                file={file}
                draggable={orderedFiles.length > 1}
                submission={submission}
                totalFiles={orderedFiles.length}
              />
            ))}
          </Stack>
        ) : (
          <Center p="xl">
            <Stack align="center" gap="xs">
              <IconFilePlus size={48} opacity={0.5} />
              <Text c="dimmed" size="sm">
                <Trans>
                  Add files to your submission using the uploader below
                </Trans>
              </Text>
            </Stack>
          </Center>
        )}
      </ScrollArea>
    </Paper>
  );
}

export function SubmissionFileManager(
  props: SubmissionEditFormFileManagerProps,
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
