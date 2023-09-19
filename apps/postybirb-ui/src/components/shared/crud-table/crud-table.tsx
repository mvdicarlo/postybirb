import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTableSelectionType,
} from '@elastic/eui';
import { EntityId, IEntityDto } from '@postybirb/types';
import { useEffect, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useUpdateView } from '../../../hooks/use-update-view';
import { HttpResponse } from '../../../transports/http-client';
import DeleteActionPopover from '../delete-action-popover/delete-action-popover';

type EditableColumnProps<T> = Array<
  EuiBasicTableColumn<T> & { editable?: boolean }
>;

type CRUDTableProps<T> = {
  isLoading: boolean;
  records: T[];
  columns: EditableColumnProps<T>;
  onCreate: () => void;
  onDelete: (ids: EntityId[]) => Promise<HttpResponse<{ success: boolean }>>;
};

export default function CRUDTable<T extends IEntityDto>(
  props: CRUDTableProps<T>
) {
  const { isLoading, records, columns, onCreate, onDelete } = props;
  const [selectedItems, setSelectedItems] = useState<T[]>([]);
  const [internalRecords, setInternalRecords] = useState(records);
  const updateView = useUpdateView();

  useEffect(() => {
    const newRecords = records.filter(
      (tc) => !records.some((r) => r.id === tc.id)
    );

    const updatedRecords = records
      .filter((r) => records.some((ir) => ir.id === r.id))
      .map((r) => {
        const updated = records.find(
          (ir) => ir.id === r.id && ir.updatedAt !== r.updatedAt
        );

        if (updated) {
          Object.assign(r, updated);
        }

        return r;
      });

    setInternalRecords([...newRecords, ...updatedRecords]);
    // Don't add records, this causes rapid renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records]);

  const onSelectionChange = (selected: T[]) => {
    setSelectedItems(selected);
  };

  const selection: EuiTableSelectionType<T> = {
    onSelectionChange,
  };

  const deleteSelectedItems = async () => {
    const res = await onDelete(selectedItems.map((s) => s.id));
    setSelectedItems([]);
    return res;
  };

  const deleteButton =
    selectedItems.length > 0 ? (
      <DeleteActionPopover onDelete={deleteSelectedItems}>
        <EuiButton
          color="danger"
          iconType="trash"
          size="s"
          aria-label="Delete selected tag groups"
        >
          <FormattedMessage id="delete" defaultMessage="Delete" />{' '}
          {selectedItems.length}
        </EuiButton>
      </DeleteActionPopover>
    ) : null;

  const tableColumns: Array<EuiBasicTableColumn<T>> = columns.map((c) => {
    const column: EuiBasicTableColumn<T> = {
      ...c,
    };
    return column;
  });

  return (
    <div className="postybirb__crud-table-container">
      <div className="postybirb__crud-table-actions">
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={10}>
            <EuiButton
              size="s"
              iconType="plus"
              aria-label="Create new tag group"
              onClick={onCreate}
            >
              <FormattedMessage id="new" defaultMessage="New" />
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{deleteButton}</EuiFlexItem>
        </EuiFlexGroup>
      </div>
      <EuiSpacer size="l" />
      <EuiBasicTable
        className="postybirb__crud-table-actions"
        items={records}
        isSelectable
        selection={selection}
        loading={isLoading}
        itemId="id"
        rowHeader="name"
        columns={tableColumns}
      />
    </div>
  );
}
