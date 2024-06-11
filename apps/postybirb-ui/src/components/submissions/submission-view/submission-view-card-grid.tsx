import { Grid } from '@mantine/core';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { SubmissionViewCard } from './submission-view-card/submission-view-card';

type SubmissionViewCardGridProps = {
  submissions: SubmissionDto[];
  onSelect(submission: SubmissionDto): void;
  selectedSubmissions: SubmissionDto[];
};

export function SubmissionViewCardGrid(props: SubmissionViewCardGridProps) {
  const { submissions, onSelect, selectedSubmissions } = props;

  return (
    <Grid>
      {submissions.map((submission) => (
        <Grid.Col span={6}>
          <SubmissionViewCard
            key={submission.id}
            submission={submission}
            onSelect={onSelect}
            isSelected={selectedSubmissions.some((s) => s.id === submission.id)}
          />
        </Grid.Col>
      ))}
    </Grid>
  );
}
