import { Box, Stack } from '@mantine/core';
import { SubmissionType } from '@postybirb/types';
import { useState } from 'react';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { SubmissionViewActions } from './submission-view-actions';
import { SubmissionViewCardGrid } from './submission-view-card-grid';

type SubmissionViewProps = {
  submissions: SubmissionDto[];
  type: SubmissionType;
};

function filterSubmissions(
  submissions: SubmissionDto[],
  filter: string
): SubmissionDto[] {
  const filterValue = filter.toLowerCase().trim();
  return submissions.filter((submission) => {
    const defaultOption = submission.getDefaultOptions();
    return defaultOption.data.title?.toLowerCase().includes(filterValue);
  });
}

export function SubmissionView(props: SubmissionViewProps) {
  const { submissions, type } = props;
  const [selectedSubmissions, setSelectedSubmissions] = useState<
    SubmissionDto[]
  >([]);
  const [nameFilter, setNameFilter] = useState<string>('');

  const submissionsToView = filterSubmissions(submissions, nameFilter);

  return (
    <Box>
      <Stack gap="sm">
        <SubmissionViewActions
          submissions={submissions}
          type={type}
          selectedSubmissions={selectedSubmissions}
          onSelect={setSelectedSubmissions}
          nameFilter={nameFilter}
          setNameFilter={setNameFilter}
        />
        <SubmissionViewCardGrid
          submissions={submissionsToView}
          selectedSubmissions={selectedSubmissions}
          onSelect={(submission) => {
            setSelectedSubmissions((current) => {
              if (current.some((s) => s.id === submission.id)) {
                return current.filter((s) => s.id !== submission.id);
              }
              return [...current, submission];
            });
          }}
        />
      </Stack>
    </Box>
  );
}
