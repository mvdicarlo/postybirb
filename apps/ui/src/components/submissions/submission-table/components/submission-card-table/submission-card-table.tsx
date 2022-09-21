import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useMemo } from 'react';
import { SubmissionDto } from '../../../../../models/dtos/submission.dto';
import { SubmissionTableCard } from './components/submission-table-card';

type SubmissionCardTableOnSelect = (id: string) => void;

type SubmissionCardTableProps = {
  submissions: SubmissionDto[];
  selectedSubmissionIds: string[];
  onSelect: SubmissionCardTableOnSelect;
};

export function SubmissionCardTable({
  submissions,
  selectedSubmissionIds,
  onSelect,
}: SubmissionCardTableProps): JSX.Element {
  const cards = useMemo(
    () =>
      submissions.map((s) => (
        <EuiFlexItem
          className="postybirb__submission-card-item"
          grow={false}
          key={s.id}
        >
          <SubmissionTableCard
            submission={s}
            selected={selectedSubmissionIds.includes(s.id)}
            onSelect={onSelect}
          />
        </EuiFlexItem>
      )),
    [submissions, selectedSubmissionIds, onSelect]
  );

  return (
    <div className="postybirb__submission-card-table">
      <EuiFlexGroup gutterSize="l" wrap justifyContent="center">
        {cards}
      </EuiFlexGroup>
    </div>
  );
}
