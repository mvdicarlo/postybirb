import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiButtonIcon,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiTableSelectionType,
  EuiText,
} from '@elastic/eui';
import { TagGroupDto } from '@postybirb/types';
import { uniq } from 'lodash';
import { useEffect, useRef, useState } from 'react';
import { Trans, msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import tagGroupsApi from '../../../api/tag-groups.api';
import { useToast } from '../../../app/app-toast-provider';
import { useUpdateView } from '../../../hooks/use-update-view';
import DeleteActionPopover from '../../shared/delete-action-popover/delete-action-popover';
import './tag-groups-table.css';

type TagGroupsTableProps = {
  tagGroups: TagGroupDto[];
};

export default function TagGroupsTable(props: TagGroupsTableProps) {
  const { addToast } = useToast();
  const { tagGroups } = props;
  const [selectedItems, setSelectedItems] = useState<TagGroupDto[]>([]);
  const tableRef = useRef<EuiBasicTable | null>(null);
  const updateView = useUpdateView();
  const [records, setRecords] = useState(tagGroups); // Internal state to protect unsaved edits

  useEffect(() => {
    const newRecords = tagGroups.filter(
      (tc) => !records.some((r) => r.id === tc.id)
    );

    const updatedRecords = records
      .filter((r) => tagGroups.some((tg) => tg.id === r.id))
      .map((r) => {
        const updated = tagGroups.find(
          (tc) => tc.id === r.id && tc.updatedAt !== r.updatedAt
        );

        if (updated) {
          Object.assign(r, updated);
        }

        return r;
      });

    setRecords([...newRecords, ...updatedRecords]);
    // Don't add records, this causes rapid renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagGroups]);

  const onSelectionChange = (selected: TagGroupDto[]) => {
    setSelectedItems(selected);
  };

  const { _ } = useLingui();

  const createNewTagGroup = () => {
    const defaultNameFromTime = Date.now();
    tagGroupsApi.create({
      name: _(msg`Tag Group ${defaultNameFromTime}`),
      tags: [],
    });
  };

  const saveChanges = ({ id, name, tags }: TagGroupDto) => {
    tagGroupsApi.update(id, { name, tags }).then(() => {
      addToast({
        id: Date.now().toString(),
        color: 'success',
        text: (
          <Trans context="update.success-tag-group">Updated tag group</Trans>
        ),
      });
    });
  };

  const deleteSelectedItems = () =>
    tagGroupsApi.remove(selectedItems.map((item) => item.id)).then((res) => {
      setSelectedItems([]);
      return res;
    });

  const deleteButton =
    selectedItems.length > 0 ? (
      <DeleteActionPopover onDelete={deleteSelectedItems}>
        <EuiButton
          color="danger"
          iconType="trash"
          size="s"
          aria-label={_(msg`Delete selected tag groups`)}
        >
          <Trans context="delete">Delete</Trans> {selectedItems.length}
        </EuiButton>
      </DeleteActionPopover>
    ) : null;

  const selection: EuiTableSelectionType<TagGroupDto> = {
    onSelectionChange,
  };

  const columns: Array<EuiBasicTableColumn<TagGroupDto>> = [
    {
      field: 'name',
      name: <Trans context="name">Name</Trans>,
      sortable: true,
      truncateText: true,
      render: (name: string, group: TagGroupDto) => (
        <EuiFormRow
          fullWidth
          className="w-full"
          isInvalid={records.some(
            (tagGroup) =>
              tagGroup.name.trim() === group.name.trim() &&
              tagGroup.id !== group.id
          )}
          error={
            <EuiText size="relative">
              <Trans context="duplicate.tag-group">Duplicate name</Trans>
            </EuiText>
          }
        >
          <EuiFieldText
            fullWidth
            placeholder={_(msg`Tag`)}
            value={name}
            compressed
            onChange={(event) => {
              // eslint-disable-next-line no-param-reassign
              group.name = event.target.value;
              updateView();
            }}
          />
        </EuiFormRow>
      ),
    },
    {
      field: 'tags',
      name: <Trans context="tags">Tags</Trans>,
      width: '60%',
      render: (tags: string[], tagGroup: TagGroupDto) => {
        const options = tags.map((tag) => ({
          label: tag,
          key: `${tagGroup.id}:${tag}`,
          value: tag,
        }));

        return (
          <EuiComboBox
            fullWidth
            compressed
            isClearable
            options={options}
            selectedOptions={options}
            onCreateOption={(tagValue: string) => {
              // eslint-disable-next-line no-param-reassign
              tagGroup.tags = uniq([...tagGroup.tags, tagValue]);
              updateView();
            }}
            onChange={(values) => {
              // eslint-disable-next-line no-param-reassign
              tagGroup.tags = uniq(
                values.map(({ value }) => value)
              ) as string[];
              updateView();
            }}
          />
        );
      },
    },
    {
      name: <Trans>Actions</Trans>,
      width: '8%',
      actions: [
        {
          render: (group: TagGroupDto) => (
            <EuiButtonIcon
              aria-label={_(msg`Save changes for ${group.name}`)}
              color="primary"
              iconType="save"
              disabled={
                !group.name.trim().length ||
                records.some(
                  (tagGroup) =>
                    tagGroup.name.trim() === group.name.trim() &&
                    tagGroup.id !== group.id
                )
              }
              onClick={() => {
                saveChanges(group);
              }}
            >
              <Trans context="save">Save</Trans>
            </EuiButtonIcon>
          ),
        },
        {
          render: (group: TagGroupDto) => (
            <DeleteActionPopover
              onDelete={() => tagGroupsApi.remove([group.id])}
            >
              <EuiButtonIcon
                color="danger"
                iconType="trash"
                aria-label={_(msg`Delete tag group ${group.name}`)}
              >
                <Trans context="delete">Delete</Trans>
              </EuiButtonIcon>
            </DeleteActionPopover>
          ),
        },
      ],
    },
  ];

  return (
    <>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={10}>
          <EuiButton
            size="s"
            iconType="plus"
            aria-label={_(msg`Create new tag group`)}
            onClick={createNewTagGroup}
          >
            <Trans context="new">New</Trans>
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{deleteButton}</EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      <EuiBasicTable
        className="postybirb__tag-group-table"
        ref={tableRef}
        items={records}
        itemId="id"
        columns={columns}
        isSelectable
        selection={selection}
        rowHeader="name"
      />
    </>
  );
}
