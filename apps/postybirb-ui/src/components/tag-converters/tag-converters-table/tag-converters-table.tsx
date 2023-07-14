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
  EuiText,
} from '@elastic/eui';
import { TagConverterDto } from '@postybirb/types';
import { useEffect, useReducer, useRef, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useQuery } from 'react-query';
import tagConvertersApi from '../../../api/tag-converters.api';
import websitesApi from '../../../api/websites.api';
import { useToast } from '../../../app/app-toast-provider';
import DeleteActionPopover from '../../shared/delete-action-popover/delete-action-popover';
import './tag-converters-table.css';

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
  const [records, setRecords] = useState(tagConverters); // Internal state to protect unsaved edits

  useEffect(() => {
    const newRecords = tagConverters.filter(
      (tc) => !records.some((r) => r.id === tc.id)
    );

    records.forEach((r) => {
      const updated = tagConverters.find(
        (tc) => tc.id === r.id && tc.updatedAt !== r.updatedAt
      );

      if (updated) {
        Object.assign(r, updated);
      }
    });

    setRecords([...newRecords, ...records]);
  }, [tagConverters, records]);

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
        <EuiButton
          color="danger"
          iconType="trash"
          size="s"
          aria-label="Delete selected tag converters"
        >
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
      render: (name: string, converter: TagConverterDto) => (
        <EuiFormRow
          fullWidth
          className="w-full"
          label={<span style={{ visibility: 'hidden' }}>Empty</span>}
          isInvalid={records.some(
            (tagConverter) =>
              tagConverter.tag.trim() === converter.tag.trim() &&
              tagConverter.id !== converter.id
          )}
          error={
            <EuiText size="relative">
              <FormattedMessage
                id="duplicate.tag-converter"
                defaultMessage="Duplicate tag"
              />
            </EuiText>
          }
        >
          <EuiFieldText
            fullWidth
            placeholder="Tag"
            value={name}
            compressed
            onChange={(event) => {
              // eslint-disable-next-line no-param-reassign
              converter.tag = event.target.value;
              forceUpdate();
            }}
          />
        </EuiFormRow>
      ),
    },
    {
      field: 'convertTo',
      name: <FormattedMessage id="websites" defaultMessage="Websites" />,
      width: '60%',
      render: (_: string[], tagConverter: TagConverterDto) => (
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
      name: <FormattedMessage id="actions" defaultMessage="Actions" />,
      width: '8%',
      actions: [
        {
          render: (converter: TagConverterDto) => (
            <EuiButtonIcon
              aria-label={`Save changes for ${converter.tag}`}
              color="primary"
              iconType="save"
              disabled={
                !converter.tag.trim().length ||
                records.some(
                  (tagConverter) =>
                    tagConverter.tag.trim() === converter.tag.trim() &&
                    tagConverter.id !== converter.id
                )
              }
              onClick={() => {
                saveChanges(converter);
              }}
            >
              <FormattedMessage id="save" defaultMessage="Save" />
            </EuiButtonIcon>
          ),
        },
        {
          render: (converter: TagConverterDto) => (
            <DeleteActionPopover
              onDelete={() => tagConvertersApi.remove([converter.id])}
            >
              <EuiButtonIcon
                color="danger"
                iconType="trash"
                aria-label={`Delete tag converter ${converter.tag}`}
              >
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
        <EuiFlexItem grow={10}>
          <EuiButton
            size="s"
            iconType="plus"
            aria-label="Create new tag group"
            onClick={createNewTagConverter}
          >
            <FormattedMessage id="new" defaultMessage="New" />
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{deleteButton}</EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      <EuiBasicTable
        className="postybirb__tag_converter_table"
        loading={isLoadingWebsiteInfo}
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
