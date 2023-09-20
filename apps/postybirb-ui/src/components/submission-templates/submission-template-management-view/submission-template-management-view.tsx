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
import { ISubmissionTemplateDto, SubmissionType } from '@postybirb/types';
import { useEffect, useMemo, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useNavigate } from 'react-router';
import submissionTemplatesApi from '../../../api/submission-templates.api';
import { useToast } from '../../../app/app-toast-provider';
import { useUpdateView } from '../../../hooks/use-update-view';
import { SubmissionTemplatePath } from '../../../pages/route-paths';
import { SubmissionTemplateStore } from '../../../stores/submission-template.store';
import { useStore } from '../../../stores/use-store';
import DeleteActionPopover from '../../shared/delete-action-popover/delete-action-popover';

type SubmissionTemplateManagementViewProps = {
  type: SubmissionType;
};

export default function SubmissionTemplateManagementView(
  props: SubmissionTemplateManagementViewProps
) {
  const { type } = props;
  const { addToast } = useToast();
  const { state, isLoading } = useStore(SubmissionTemplateStore);
  const [selectedItems, setSelectedItems] = useState<ISubmissionTemplateDto[]>(
    []
  );
  const templates = useMemo(
    () => state.filter((t) => t.type === type),
    [state, type]
  );
  const [records, setRecords] = useState(templates);
  const updateView = useUpdateView();
  const history = useNavigate();

  useEffect(() => {
    const newRecords = templates.filter(
      (tc) => !records.some((r) => r.id === tc.id)
    );

    const updatedRecords = records
      .filter((r) => templates.some((template) => template.id === r.id))
      .map((r) => {
        const updated = templates.find(
          (t) => t.id === r.id && t.updatedAt !== r.updatedAt
        );

        if (updated) {
          Object.assign(r, updated);
        }

        return r;
      });

    setRecords([...newRecords, ...updatedRecords]);
    // Don't add records, this causes rapid renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates]);

  const onSelectionChange = (selected: ISubmissionTemplateDto[]) => {
    setSelectedItems(selected);
  };

  const selection: EuiTableSelectionType<ISubmissionTemplateDto> = {
    onSelectionChange,
  };

  const navToEdit = (id: string) => {
    history(`${SubmissionTemplatePath}/${id}`);
  };

  const saveChanges = ({ id, name }: ISubmissionTemplateDto) => {
    submissionTemplatesApi.update(id, { name, options: [] }).then(() => {
      addToast({
        id: Date.now().toString(),
        color: 'success',
        text: (
          <FormattedMessage
            id="update.success-submission-template"
            defaultMessage="Updated submission template"
          />
        ),
      });
    });
  };

  const deleteSelectedItems = async () => {
    const res = await submissionTemplatesApi.remove(
      selectedItems.map((s) => s.id)
    );
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
          aria-label="Delete selected submission templates"
        >
          <FormattedMessage id="delete" defaultMessage="Delete" />{' '}
          {selectedItems.length}
        </EuiButton>
      </DeleteActionPopover>
    ) : null;

  const tableColumns: Array<EuiBasicTableColumn<ISubmissionTemplateDto>> = [
    {
      field: 'name',
      name: <FormattedMessage id="name" defaultMessage="Name" />,
      sortable: true,
      truncateText: true,
      render: (name: string, template: ISubmissionTemplateDto) => (
        <EuiFormRow
          fullWidth
          className="w-full"
          isInvalid={records.some(
            (record) =>
              record.name.trim() === template.name.trim() &&
              record.id !== template.id
          )}
          error={
            <EuiText size="relative">
              <FormattedMessage
                id="duplicate.submission-template"
                defaultMessage="Duplicate name"
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
              template.name = event.target.value;
              updateView();
            }}
          />
        </EuiFormRow>
      ),
    },
    {
      field: 'id',
      width: '20%',
      name: <FormattedMessage id="actions" defaultMessage="Actions" />,
      render: (_: unknown, template: ISubmissionTemplateDto) => (
        <div>
          <EuiButtonIcon
            title="Save"
            aria-label={`Save changes for ${template.name}`}
            color="primary"
            iconType="save"
            disabled={
              !template.name.trim().length ||
              records.some(
                (record) =>
                  record.name.trim() === template.name.trim() &&
                  record.id !== template.id
              )
            }
            onClick={() => {
              saveChanges(template);
            }}
          >
            <FormattedMessage id="save" defaultMessage="Save" />
          </EuiButtonIcon>
          <EuiButtonIcon
            title="Edit"
            aria-label={`Edit ${template.name}`}
            color="primary"
            iconType="documentEdit"
            disabled={
              !template.name.trim().length ||
              records.some(
                (record) =>
                  record.name.trim() === template.name.trim() &&
                  record.id !== template.id
              )
            }
            onClick={() => {
              navToEdit(template.id);
            }}
          >
            <FormattedMessage id="edit" defaultMessage="Edit" />
          </EuiButtonIcon>
          <DeleteActionPopover
            onDelete={() => submissionTemplatesApi.remove([template.id])}
          >
            <EuiButtonIcon
              title="Delete"
              className="ml-4"
              color="danger"
              iconType="trash"
              aria-label={`Delete submission template ${template.name}`}
            >
              <FormattedMessage id="delete" defaultMessage="Delete" />
            </EuiButtonIcon>
          </DeleteActionPopover>
        </div>
      ),
    },
  ];

  return (
    <div className="submission-template-table-container">
      <div className="submission-template-table-actions">
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={10}>
            <EuiButton
              size="s"
              iconType="plus"
              aria-label="Create new submission template"
              onClick={() => {
                submissionTemplatesApi.create({
                  name: `Submission Template ${Date.now()}`,
                  type,
                });
              }}
            >
              <FormattedMessage id="new" defaultMessage="New" />
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{deleteButton}</EuiFlexItem>
        </EuiFlexGroup>
      </div>
      <EuiSpacer size="l" />
      <EuiBasicTable
        className="postybirb__submission-template-table"
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
