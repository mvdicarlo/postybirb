import { EuiFieldSearch, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ISubmissionDto } from '@postybirb/dto';
import { useState } from 'react';

// eslint-disable-next-line @typescript-eslint/ban-types
type SubmissionTableProps = {
  submissions: ISubmissionDto[];
};

export function SubmissionTable(props: SubmissionTableProps): JSX.Element {
  const { submissions } = props;
  const [mode, setTableMode] = useState<'table' | 'card'>('table');
  const [searchValue, setSearchValue] = useState<string>();

  const lowerCaseSearch = searchValue?.toLowerCase().trim() || '';
  const filteredSubmissions = submissions.filter((submission) =>
    submission.options.some((option) =>
      option.data.title?.toLowerCase()?.includes(lowerCaseSearch)
    )
  );

  console.log(filteredSubmissions);

  return (
    <div className="postybirb__submission-table-container">
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem>
          <EuiFieldSearch
            fullWidth
            value={searchValue}
            onSearch={setSearchValue}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
