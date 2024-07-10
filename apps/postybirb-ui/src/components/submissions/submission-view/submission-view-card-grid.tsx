/* eslint-disable no-nested-ternary */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Grid } from '@mantine/core';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { SubmissionViewCard } from './submission-view-card/submission-view-card';

type SubmissionViewCardGridProps = {
  submissions: SubmissionDto[];
  onSelect(submission: SubmissionDto): void;
  selectedSubmissions: SubmissionDto[];
};

// TODO - Figure out a better drag and drop solution. This one is buggy.
export function SubmissionViewCardGrid(props: SubmissionViewCardGridProps) {
  const { submissions, onSelect, selectedSubmissions } = props;
  const orderedSubmissions = submissions.sort((a, b) => a.order - b.order);
  return (
    <Grid>
      {orderedSubmissions.map((submission) => (
        <Grid.Col
          span={submissions.length > 1 ? 12 : 12}
          key={`card-${submission.id}`}
        >
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
