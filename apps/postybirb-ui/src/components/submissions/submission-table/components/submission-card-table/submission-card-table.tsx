import { EuiFlexGrid, EuiFlexItem, useIsWithinBreakpoints } from '@elastic/eui';
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
  const isLarge = useIsWithinBreakpoints(['xl']);
  const cards = useMemo(
    () =>
      submissions.map((s) => (
        <EuiFlexItem className="postybirb__submission-card-item" key={s.id}>
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
      <EuiFlexGrid columns={isLarge ? 2 : 1}>{cards}</EuiFlexGrid>
    </div>
  );
}
