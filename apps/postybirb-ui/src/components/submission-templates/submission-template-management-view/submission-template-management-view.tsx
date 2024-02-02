/* eslint-disable @typescript-eslint/no-non-null-assertion */
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
import { SubmissionType } from '@postybirb/types';
import { useEffect, useMemo, useState } from 'react';
import { Trans } from '@lingui/macro';
import { useNavigate } from 'react-router';
import submissionsApi from '../../../api/submission.api';
import { useToast } from '../../../app/app-toast-provider';
import { useUpdateView } from '../../../hooks/use-update-view';
import { SubmissionDto } from '../../../models/dtos/submission.dto';
import { EditSubmissionPath } from '../../../pages/route-paths';
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
  const [selectedItems, setSelectedItems] = useState<SubmissionDto[]>([]);
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

  const onSelectionChange = (selected: SubmissionDto[]) => {
    setSelectedItems(selected);
  };

  const selection: EuiTableSelectionType<SubmissionDto> = {
    onSelectionChange,
  };

  const navToEdit = (id: string) => {
    history(`${EditSubmissionPath}/${id}`);
  };

  const saveChanges = ({ id, metadata }: SubmissionDto) => {
    const { name } = metadata.template!;
    submissionsApi.updateTemplateName(id, { name }).then(() => {
      addToast({
        id: Date.now().toString(),
        color: 'success',
        text: <Trans>Updated submission template</Trans>,
      });
    });
  };

  const deleteSelectedItems = async () => {
    const res = await submissionsApi.remove(selectedItems.map((s) => s.id));
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
          <Trans>Delete</Trans> {selectedItems.length}
        </EuiButton>
      </DeleteActionPopover>
    ) : null;

  const tableColumns: Array<EuiBasicTableColumn<SubmissionDto>> = [
    {
      field: 'name',
      name: <Trans>Name</Trans>,
      sortable: true,
      truncateText: true,
      render: (name: string, template: SubmissionDto) => (
        <EuiFormRow
          fullWidth
          className="w-full"
          isInvalid={records.some(
            (record) =>
              record.getTemplateName().trim() ===
                template.getTemplateName().trim() && record.id !== template.id
          )}
          error={
            <EuiText size="relative">
              <Trans comment="Error on submission template edit/create">
                Duplicate name
              </Trans>
            </EuiText>
          }
        >
          <EuiFieldText
            fullWidth
            placeholder="Name"
            value={template.getTemplateName()}
            compressed
            onChange={(event) => {
              // eslint-disable-next-line no-param-reassign
              template.metadata.template!.name = event.target.value;
              updateView();
            }}
          />
        </EuiFormRow>
      ),
    },
    {
      field: 'id',
      width: '20%',
      name: <Trans>Actions</Trans>,
      render: (_: unknown, template: SubmissionDto) => (
        <div>
          <EuiButtonIcon
            title="Save"
            aria-label={`Save changes for ${template.getTemplateName()}`}
            color="primary"
            iconType="save"
            disabled={
              !template.getTemplateName().trim().length ||
              records.some(
                (record) =>
                  record.getTemplateName().trim() ===
                    template.getTemplateName().trim() &&
                  record.id !== template.id
              )
            }
            onClick={() => {
              saveChanges(template);
            }}
          >
            <Trans>Save</Trans>
          </EuiButtonIcon>
          <EuiButtonIcon
            title="Edit"
            aria-label={`Edit ${template.getTemplateName()}`}
            color="primary"
            iconType="documentEdit"
            disabled={
              !template.getTemplateName().trim().length ||
              records.some(
                (record) =>
                  record.getTemplateName().trim() ===
                    template.getTemplateName().trim() &&
                  record.id !== template.id
              )
            }
            onClick={() => {
              navToEdit(template.id);
            }}
          >
            <Trans>Edit</Trans>
          </EuiButtonIcon>
          <DeleteActionPopover
            onDelete={() => submissionsApi.remove([template.id])}
          >
            <EuiButtonIcon
              title="Delete"
              className="ml-4"
              color="danger"
              iconType="trash"
              aria-label={`Delete submission template ${template.getTemplateName()}`}
            >
              <Trans>Delete</Trans>
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
                submissionsApi.create({
                  name: `Submission Template ${Date.now()}`,
                  type,
                  isTemplate: true,
                });
              }}
            >
              <Trans>New</Trans>
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
