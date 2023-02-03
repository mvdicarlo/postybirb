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
import { ITagGroup } from '@postybirb/types';
import { uniq } from 'lodash';
import { useReducer, useRef, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import TagGroupsApi from '../../../api/tag-groups.api';

type TagGroupsTableProps = {
  tagGroups: ITagGroup[];
};

export default function TagGroupsTable(props: TagGroupsTableProps) {
  const { tagGroups } = props;
  const [selectedItems, setSelectedItems] = useState<ITagGroup[]>([]);
  const tableRef = useRef<EuiBasicTable | null>(null);
  const [, forceUpdate] = useReducer((x: number) => (x === 0 ? 1 : 0), 0);

  const onSelectionChange = (selected: ITagGroup[]) => {
    setSelectedItems(selected);
  };

  const createNewTagGroup = () => {
    TagGroupsApi.create({ name: 'New Tag Group', tags: [] });
  };

  const saveTagGroupChanges = ({ id, tags, name }: ITagGroup) => {
    TagGroupsApi.update({ id, tags, name });
  };

  const deleteSelectedItems = () => {
    TagGroupsApi.remove(selectedItems.map((item) => item.id));
    setSelectedItems([]);
  };

  const deleteButton =
    selectedItems.length > 0 ? (
      <EuiButton color="danger" iconType="trash" onClick={deleteSelectedItems}>
        Delete {selectedItems.length}
      </EuiButton>
    ) : null;

  const selection: EuiTableSelectionType<ITagGroup> = {
    onSelectionChange,
  };

  const columns: Array<EuiBasicTableColumn<ITagGroup>> = [
    {
      field: 'name',
      name: <FormattedMessage id="name" defaultMessage="Name" />,
      sortable: true,
      truncateText: true,
      render: (name: string, tagGroup: ITagGroup) => (
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
      render: (tags: string[], tagGroup: ITagGroup) => {
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
          onClick: (tagGroup: ITagGroup) => {
            TagGroupsApi.remove([tagGroup.id]);
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
