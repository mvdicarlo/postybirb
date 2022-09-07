import {
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { ISubmissionDto } from '@postybirb/dto';
import { useMemo, useState } from 'react';
import { SubmissionCardTable } from './submission-card-table';
import { SubmissionGridTable } from './submission-grid-table';
import 'regenerator-runtime';

type SubmissionTableProps = {
  submissions: ISubmissionDto[];
};

export function SubmissionTable(props: SubmissionTableProps): JSX.Element {
  const { submissions } = props;
  const [mode, setTableMode] = useState<'table' | 'card'>('table');
  const [searchValue, setSearchValue] = useState<string>();

  const lowerCaseSearch = searchValue?.toLowerCase().trim() || '';
  const filteredSubmissions = useMemo(
    () =>
      submissions.filter((submission) =>
        submission.options.some(
          (option) =>
            option.data.title?.toLowerCase()?.includes(lowerCaseSearch) ||
            !option.data.title
        )
      ),
    [lowerCaseSearch, submissions]
  );

  const table = useMemo(
    () =>
      mode === 'table' ? (
        <SubmissionGridTable submissions={filteredSubmissions} />
      ) : (
        <SubmissionCardTable submissions={filteredSubmissions} />
      ),
    [mode, filteredSubmissions]
  );

  return (
    <div className="postybirb__submission-table-container">
      <EuiFlexGroup gutterSize="m" wrap={false}>
        <EuiFlexItem>
          <EuiFieldText
            icon="search"
            fullWidth
            value={searchValue}
            aria-label="Submission table search field"
            name="submission-table-search"
            onChange={(e) => {
              setSearchValue(e.target.value);
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="visTable"
            size="m"
            iconSize="l"
            display={mode === 'table' ? 'fill' : 'empty'}
            onClick={() => setTableMode('table')}
            aria-label="Table mode"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="grid"
            size="m"
            iconSize="l"
            display={mode === 'card' ? 'fill' : 'empty'}
            onClick={() => setTableMode('card')}
            aria-label="Card mode"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {table}
    </div>
  );
}
