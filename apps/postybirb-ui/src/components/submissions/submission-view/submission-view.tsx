import { Box, Stack } from '@mantine/core';
import { SubmissionType } from '@postybirb/types';
import { useState } from 'react';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { SubmissionViewCardGrid } from './submission-view-card-grid';
import { SubmissionViewActions } from './submission-view-card/submission-view-actions/submission-view-actions';

type SubmissionViewProps = {
  submissions: SubmissionDto[];
  type: SubmissionType;
};

function filterSubmissions(
  submissions: SubmissionDto[],
  filter: string,
): SubmissionDto[] {
  if (!filter) {
    return submissions;
  }

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
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [nameFilter, setNameFilter] = useState<string>('');

  const submissionsToView = filterSubmissions(submissions, nameFilter).filter(
    (s) => !s.isArchived,
  );
  return (
    <Box>
      <Stack gap="sm">
        <SubmissionViewActions
          view={view}
          setView={setView}
          submissions={submissions}
          type={type}
          selectedSubmissions={selectedSubmissions}
          onSelect={setSelectedSubmissions}
          nameFilter={nameFilter}
          setNameFilter={setNameFilter}
        />
        <SubmissionViewCardGrid
          view={view}
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
