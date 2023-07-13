import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiTableSelectionType,
} from '@elastic/eui';
import { TagConverterDto } from '@postybirb/types';
import { useReducer, useRef, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useQuery } from 'react-query';
import tagConvertersApi from '../../../api/tag-converters.api';
import websitesApi from '../../../api/websites.api';
import { useToast } from '../../../app/app-toast-provider';
import DeleteActionPopover from '../../shared/delete-action-popover/delete-action-popover';

type TagConvertersTableProps = {
  tagConverters: TagConverterDto[];
};

export default function TagConvertersTable(props: TagConvertersTableProps) {
  const { addToast } = useToast();
  const { data: websiteInfo, isLoading: isLoadingWebsiteInfo } = useQuery(
    'website-info',
    () => websitesApi.getWebsiteInfo().then((res) => res.body),
    {
      refetchInterval: false,
      refetchOnWindowFocus: false,
    }
  );
  const { tagConverters } = props;
  const [selectedItems, setSelectedItems] = useState<TagConverterDto[]>([]);
  const tableRef = useRef<EuiBasicTable | null>(null);
  const [, forceUpdate] = useReducer((x: number) => (x === 0 ? 1 : 0), 0);

  const tagSupportingWebsites = (websiteInfo ?? [])
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
    .filter((website) => website.metadata.supportsTags !== false);

  const onSelectionChange = (selected: TagConverterDto[]) => {
    setSelectedItems(selected);
  };

  const createNewTagConverter = () => {
    tagConvertersApi.create({ tag: `Tag ${Date.now()}`, convertTo: {} });
  };

  const saveChanges = ({ id, tag, convertTo }: TagConverterDto) => {
    tagConvertersApi.update(id, { tag, convertTo }).then(() => {
      addToast({
        id: Date.now().toString(),
        color: 'success',
        text: (
          <FormattedMessage
            id="update.success-tag-converter"
            defaultMessage="Updated tag converter"
          />
        ),
      });
    });
  };

  const deleteSelectedItems = () =>
    tagConvertersApi
      .remove(selectedItems.map((item) => item.id))
      .then((res) => {
        setSelectedItems([]);
        return res;
      });

  const deleteButton =
    selectedItems.length > 0 ? (
      <DeleteActionPopover onDelete={deleteSelectedItems}>
        <EuiButton color="danger" iconType="trash">
          <FormattedMessage id="delete" defaultMessage="Delete" />{' '}
          {selectedItems.length}
        </EuiButton>
      </DeleteActionPopover>
    ) : null;

  const selection: EuiTableSelectionType<TagConverterDto> = {
    onSelectionChange,
  };

  const columns: Array<EuiBasicTableColumn<TagConverterDto>> = [
    {
      field: 'tag',
      name: <FormattedMessage id="tag" defaultMessage="Tag" />,
      sortable: true,
      truncateText: true,
      render: (name: string, tagGroup: TagConverterDto) => (
        <EuiFieldText
          placeholder="Tag"
          value={name}
          compressed
          onChange={(event) => {
            // eslint-disable-next-line no-param-reassign
            tagGroup.tag = event.target.value;
            forceUpdate();
          }}
        />
      ),
    },
    {
      field: 'convertTo',
      name: <FormattedMessage id="websites" defaultMessage="Websites" />,
      width: '60%',
      render: (tags: string[], tagConverter: TagConverterDto) => (
        <div className="flex flex-wrap">
          {tagSupportingWebsites.map((website) => (
            <div className="mr-1">
              <EuiFormRow label={website.displayName}>
                <EuiFieldText
                  compressed
                  value={tagConverter.convertTo[website.id] ?? ''}
                  onChange={(event) => {
                    // eslint-disable-next-line no-param-reassign
                    tagConverter.convertTo = {
                      ...tagConverter.convertTo,
                      [website.id]: event.target.value,
                    };
                    forceUpdate();
                  }}
                  onBlur={(event) => {
                    // eslint-disable-next-line no-param-reassign
                    tagConverter.convertTo = {
                      ...tagConverter.convertTo,
                      [website.id]: event.target.value.trim(),
                    };
                    forceUpdate();
                  }}
                />
              </EuiFormRow>
            </div>
          ))}
        </div>
      ),
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
          onClick: saveChanges,
        },
        {
          render: (converter: TagConverterDto) => (
            <DeleteActionPopover
              onDelete={() => tagConvertersApi.remove([converter.id])}
            >
              <EuiButtonIcon color="danger" iconType="trash">
                <FormattedMessage id="delete" defaultMessage="Delete" />
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
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            onClick={createNewTagConverter}
            iconType="plus"
            aria-label="Create new tag group"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{deleteButton}</EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      <EuiBasicTable
        loading={isLoadingWebsiteInfo}
        ref={tableRef}
        items={tagConverters}
        itemId="id"
        columns={columns}
        isSelectable
        selection={selection}
        rowHeader="name"
      />
    </>
  );
}
