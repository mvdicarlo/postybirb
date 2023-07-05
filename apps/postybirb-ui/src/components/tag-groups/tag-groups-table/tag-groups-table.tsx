import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiButtonIcon,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTableSelectionType,
} from '@elastic/eui';
import { TagGroupDto } from '@postybirb/types';
import { uniq } from 'lodash';
import { useReducer, useRef, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import tagGroupsApi from '../../../api/tag-groups.api';

type TagGroupsTableProps = {
  tagGroups: TagGroupDto[];
};

export default function TagGroupsTable(props: TagGroupsTableProps) {
  const { tagGroups } = props;
  const [selectedItems, setSelectedItems] = useState<TagGroupDto[]>([]);
  const tableRef = useRef<EuiBasicTable | null>(null);
  const [, forceUpdate] = useReducer((x: number) => (x === 0 ? 1 : 0), 0);

  const onSelectionChange = (selected: TagGroupDto[]) => {
    setSelectedItems(selected);
  };

  const createNewTagGroup = () => {
    tagGroupsApi.create({ name: 'New Tag Group', tags: [] });
  };

  const saveTagGroupChanges = ({ id, tags, name }: TagGroupDto) => {
    tagGroupsApi.update(id, { tags, name });
  };

  const deleteSelectedItems = () => {
    tagGroupsApi.remove(selectedItems.map((item) => item.id));
    setSelectedItems([]);
  };

  const deleteButton =
    selectedItems.length > 0 ? (
      <EuiButton color="danger" iconType="trash" onClick={deleteSelectedItems}>
        Delete {selectedItems.length}
      </EuiButton>
    ) : null;

  const selection: EuiTableSelectionType<TagGroupDto> = {
    onSelectionChange,
  };

  const columns: Array<EuiBasicTableColumn<TagGroupDto>> = [
    {
      field: 'name',
      name: <FormattedMessage id="name" defaultMessage="Name" />,
      sortable: true,
      truncateText: true,
      render: (name: string, tagGroup: TagGroupDto) => (
        <EuiFieldText
          placeholder="Name"
          value={name}
          compressed
          onChange={(event) => {
            // eslint-disable-next-line no-param-reassign
            tagGroup.name = event.target.value;
            forceUpdate();
          }}
        />
      ),
    },
    {
      field: 'tags',
      name: <FormattedMessage id="tags" defaultMessage="Tags" />,
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
              forceUpdate();
            }}
            onChange={(values) => {
              // eslint-disable-next-line no-param-reassign
              tagGroup.tags = uniq(
                values.map(({ value }) => value)
              ) as string[];
              forceUpdate();
            }}
          />
        );
      },
    },
    {
      name: 'Actions',
      width: '8%',
      actions: [
        {
          name: 'Save',
          description: 'Save changes',
          type: 'icon',
          icon: 'save',
          onClick: saveTagGroupChanges,
        },
        {
          name: 'Delete',
          description: 'Delete tag group',
          type: 'icon',
          icon: 'trash',
          color: 'danger',
          onClick: (tagGroup: TagGroupDto) => {
            tagGroupsApi.remove([tagGroup.id]);
          },
        },
      ],
    },
  ];

  return (
    <>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            onClick={createNewTagGroup}
            iconType="plus"
            aria-label="Create new tag group"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{deleteButton}</EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      <EuiBasicTable
        ref={tableRef}
        items={tagGroups}
        itemId="id"
        columns={columns}
        isSelectable
        selection={selection}
        rowHeader="name"
      />
    </>
  );
}
