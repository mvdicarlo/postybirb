import {
  EuiFieldText,
  EuiHeader,
  EuiHeaderSection,
  EuiHeaderSectionItem,
  EuiSpacer,
} from '@elastic/eui';
import { useCallback, useMemo, useState } from 'react';
import 'regenerator-runtime';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { SubmissionCardTable } from './components/submission-card-table/submission-card-table';
import { SubmissionTableActions } from './components/submission-table-actions/submission-table-actions';
import './submission-table.css';

type SubmissionTableProps = {
  submissions: SubmissionDto[];
};

export function SubmissionTable(props: SubmissionTableProps): JSX.Element {
  const { submissions } = props;
  const [searchValue, setSearchValue] = useState<string>('');
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<string[]>(
    []
  );

  const onSelect = useCallback(
    (id: string) => {
      const copy = [...selectedSubmissionIds];

      const index = selectedSubmissionIds.indexOf(id);
      if (index === -1) {
        copy.push(id);
      } else {
        copy.splice(index, 1);
      }

      setSelectedSubmissionIds(copy);
    },
    [selectedSubmissionIds]
  );

  const lowerCaseSearch = searchValue.toLowerCase().trim();
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

  return (
    <div className="postybirb__submission-table-container">
      <EuiHeader style={{ position: 'sticky', top: 64 }}>
        <EuiHeaderSection style={{ marginRight: '1em' }}>
          <EuiHeaderSectionItem>
            <SubmissionTableActions
              submissions={submissions}
              onUnselectAll={() => {
                setSelectedSubmissionIds([]);
              }}
              onSelectAll={() => {
                setSelectedSubmissionIds(
                  submissions.map((submission) => submission.id)
                );
              }}
              selected={submissions.filter((submission) =>
                selectedSubmissionIds.includes(submission.id)
              )}
            />
          </EuiHeaderSectionItem>
        </EuiHeaderSection>
        <EuiHeaderSection grow>
          <EuiHeaderSectionItem className="w-full">
            <EuiFieldText
              icon="search"
              fullWidth
              compressed
              value={searchValue}
              aria-label="Submission table search field"
              name="submission-table-search"
              onChange={(e) => {
                setSearchValue(e.target.value);
              }}
            />
          </EuiHeaderSectionItem>
        </EuiHeaderSection>
        <EuiHeaderSection style={{ marginLeft: '.50em' }}>
          <EuiHeaderSectionItem>
            {filteredSubmissions.length} / {submissions.length}
          </EuiHeaderSectionItem>
        </EuiHeaderSection>
      </EuiHeader>
      <EuiSpacer size="m" />
      <SubmissionCardTable
        submissions={filteredSubmissions}
        selectedSubmissionIds={selectedSubmissionIds}
        onSelect={onSelect}
      />
    </div>
  );
}
