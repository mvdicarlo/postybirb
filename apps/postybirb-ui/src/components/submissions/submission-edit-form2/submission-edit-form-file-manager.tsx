import { Box, Paper, ScrollArea, Space, Stack } from '@mantine/core';
import { useEffect, useRef } from 'react';
import Sortable from 'sortablejs';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { SubmissionUploader } from '../submission-uploader/submission-uploader';

type SubmissionEditFormFileManagerProps = {
  submission: SubmissionDto;
};

function FileView({ submission }: SubmissionEditFormFileManagerProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    // No sort for only 1 file
    if (submission.files.length <= 1) {
      return () => {};
    }

    if (!el) {
      // eslint-disable-next-line lingui/no-unlocalized-strings, no-console
      console.warn('Could not find sortable element');
      return () => {};
    }
    const sortable = new Sortable(el, {
      disabled: submission.files.length > 1,
      draggable: '.sortable-file',
      direction: 'vertical',
      onEnd: (event) => {
        // TODO - update submission.files order
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
  }, [ref, submission]);

  return (
    <ScrollArea
      flex="7"
      h={submission.files.length * 150}
      bg="var(--mantine-color-dark-filled)"
      p="md"
      style={{ borderRadius: 'var(--mantine-radius-md)' }}
    >
      <Stack id="submission-file-view" ref={ref}>
        {submission.files.map((file) => (
          <Paper
            key={file.id}
            p="md"
            style={{
              borderRadius: 4,
              cursor: submission.files.length > 1 ? 'grab' : undefined,
            }}
            className="sortable-file"
          >
            {file.fileName}
          </Paper>
        ))}
      </Stack>
    </ScrollArea>
  );
}

export function SubmissionEditFormFileManager(
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
