import { Trans } from '@lingui/macro';
import { Box, Paper, Stack, Text, Transition } from '@mantine/core';
import { SubmissionType } from '@postybirb/types';
import { useEffect, useState } from 'react';
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // TODO - Figure out how to block editing of a submission that is actively posting
  const submissionsToView = filterSubmissions(submissions, nameFilter).filter(
    (s) => !s.isArchived,
  );

  return (
    <Box>
      <Transition mounted={mounted} transition="fade" duration={300}>
        {(styles) => (
          <Stack gap="md" style={styles}>
            <Paper shadow="xs" p="xs" radius="md">
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
            </Paper>

            {submissionsToView.length === 0 ? (
              <Transition mounted={mounted} transition="fade" duration={300}>
                {(s) => (
                  <Paper
                    p="xl"
                    withBorder
                    radius="md"
                    style={{ ...s, textAlign: 'center' }}
                  >
                    <Text c="dimmed" size="lg">
                      {nameFilter ? (
                        <Trans>No submissions match your search criteria</Trans>
                      ) : (
                        <Trans>
                          No submissions available. Upload some files to get
                          started!
                        </Trans>
                      )}
                    </Text>
                  </Paper>
                )}
              </Transition>
            ) : (
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
            )}
          </Stack>
        )}
      </Transition>
    </Box>
  );
}
