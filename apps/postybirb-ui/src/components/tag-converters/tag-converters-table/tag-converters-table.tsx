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
import { useEffect, useRef, useState } from 'react';
import { Trans } from '@lingui/macro';
import tagConvertersApi from '../../../api/tag-converters.api';
import { useToast } from '../../../app/app-toast-provider';
import { useUpdateView } from '../../../hooks/use-update-view';
import { useStore } from '../../../stores/use-store';
import { WebsiteStore } from '../../../stores/website.store';
import DeleteActionPopover from '../../shared/delete-action-popover/delete-action-popover';
import './tag-converters-table.css';

type TagConvertersTableProps = {
  tagConverters: TagConverterDto[];
};

export default function TagConvertersTable(props: TagConvertersTableProps) {
  const { addToast } = useToast();
  const { state: websiteInfo, isLoading: isLoadingWebsiteInfo } =
    useStore(WebsiteStore);
  const { tagConverters } = props;
  const [selectedItems, setSelectedItems] = useState<TagConverterDto[]>([]);
  const tableRef = useRef<EuiBasicTable | null>(null);
  const updateView = useUpdateView();
  const [records, setRecords] = useState(tagConverters); // Internal state to protect unsaved edits

  useEffect(() => {
    const newRecords = tagConverters.filter(
      (tc) => !records.some((r) => r.id === tc.id)
    );

    const updatedRecords = records
      .filter((r) => tagConverters.some((tc) => tc.id === r.id))
      .map((r) => {
        const updated = tagConverters.find(
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
  }, [tagConverters]);

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
          <Trans id="update.success-tag-converter">Updated tag converter</Trans>
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
          <Trans id="delete">Delete</Trans> {selectedItems.length}
        </EuiButton>
      </DeleteActionPopover>
    ) : null;

  const selection: EuiTableSelectionType<TagConverterDto> = {
    onSelectionChange,
  };

  const columns: Array<EuiBasicTableColumn<TagConverterDto>> = [
    {
      field: 'tag',
      name: <Trans id="tag">Tag</Trans>,
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
              <Trans id="duplicate.tag-converter">Duplicate tag</Trans>
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
              updateView();
            }}
          />
        </EuiFormRow>
      ),
    },
    {
      field: 'convertTo',
      name: <Trans id="websites">Websites</Trans>,
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
                    updateView();
                  }}
                  onBlur={(event) => {
                    // eslint-disable-next-line no-param-reassign
                    tagConverter.convertTo = {
                      ...tagConverter.convertTo,
                      [website.id]: event.target.value.trim(),
                    };
                    updateView();
                  }}
                />
              </EuiFormRow>
            </div>
          ))}
        </div>
      ),
    },
    {
      name: <Trans id="actions">Actions</Trans>,
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
              <Trans id="save">Save</Trans>
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
                <Trans id="delete">Delete</Trans>
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
            <Trans id="new">New</Trans>
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
