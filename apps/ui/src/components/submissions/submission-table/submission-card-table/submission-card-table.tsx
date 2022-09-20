import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useMemo } from 'react';
import { SubmissionDto } from '../../../../models/dtos/submission.dto';
import { SubmissionTableCard } from './components/submission-table-card';

type SubmissionCardTableProps = {
  submissions: SubmissionDto[];
};

export function SubmissionCardTable({
  submissions,
}: SubmissionCardTableProps): JSX.Element {
  const cards = useMemo(
    () =>
      submissions.map((s) => (
        <EuiFlexItem
          className="postybirb__submission-card-item"
          grow={false}
          key={s.id}
        >
          <SubmissionTableCard submission={s} />
        </EuiFlexItem>
      )),
    [submissions]
  );
  return (
    <div className="postybirb__submission-card-table">
      <EuiFlexGroup gutterSize="l" wrap>
        {cards}
      </EuiFlexGroup>
    </div>
  );
}
