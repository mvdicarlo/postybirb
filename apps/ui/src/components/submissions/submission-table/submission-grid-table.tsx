import { EuiDataGrid, EuiDataGridColumn } from '@elastic/eui';
import { ISubmissionDto } from '@postybirb/dto';
import moment from 'moment';
import { useMemo, useState } from 'react';
import { FormattedMessage } from 'react-intl';

type SubmissionGridTableProps = {
  submissions: ISubmissionDto[];
};

const fileSubmissionColumns: EuiDataGridColumn[] = [
  {
    id: 'name',
    display: <FormattedMessage id="name" defaultMessage="Name" />,
  },
  {
    id: 'thumbnail',
    display: <FormattedMessage id="file" defaultMessage="File" />,
  },
  {
    id: 'lastUpdated',
    display: <FormattedMessage id="last-updated" defaultMessage="Updated" />,
  },
];
const messageSubmissionColumns: EuiDataGridColumn[] = [
  {
    id: 'name',
    display: <FormattedMessage id="name" defaultMessage="Name" />,
  },
  {
    id: 'lastUpdated',
    display: <FormattedMessage id="last-updated" defaultMessage="Updated" />,
  },
];

type SubmissionDataValue = {
  id: string;
  name: string;
  thumbnail?: string;
  lastUpdated: string;
};

function convertToSubmissionDataValue(
  submissions: ISubmissionDto[]
): SubmissionDataValue[] {
  return submissions.map((submission) => {
    const { id, updatedAt, options, files } = submission;
    const defaultOption = options.find((o) => !o.account);
    return {
      id,
      lastUpdated: moment(updatedAt).fromNow(),
      name: defaultOption?.data.title || 'New submission',
      thumbnail: files.length ? files[0].id : undefined,
    };
  });
}

export function SubmissionGridTable({
  submissions,
}: SubmissionGridTableProps): JSX.Element {
  const data = useMemo(
    () => convertToSubmissionDataValue(submissions),
    [submissions]
  );

  const columns: EuiDataGridColumn[] = useMemo(
    () =>
      data.some((s) => s.thumbnail)
        ? fileSubmissionColumns
        : messageSubmissionColumns,
    [data]
  );

  const [visibleColumns, setVisibleColumns] = useState(
    columns.map(({ id }) => id)
  );

  return (
    <EuiDataGrid
      aria-label="Submission data grid"
      columns={columns}
      rowCount={submissions.length}
      columnVisibility={{ visibleColumns, setVisibleColumns }}
      renderCellValue={({ rowIndex, columnId }) => {
        const value = data[rowIndex][columnId as keyof SubmissionDataValue];

        return value;
      }}
    />
  );
}
