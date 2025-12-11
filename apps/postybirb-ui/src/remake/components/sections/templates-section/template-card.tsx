/**
 * TemplateCard - Card component for displaying a template in the list.
 */

import { Trans } from '@lingui/react/macro';
import {
    ActionIcon,
    Card,
    Group,
    Text,
    TextInput,
    ThemeIcon,
    Tooltip,
} from '@mantine/core';
import { SubmissionType } from '@postybirb/types';
import {
    IconCheck,
    IconFile,
    IconMessage,
    IconPencil,
    IconTrash,
    IconX,
} from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';
import submissionApi from '../../../api/submission.api';
import type { SubmissionRecord } from '../../../stores/records';
import {
    showDeletedNotification,
    showDeleteErrorNotification,
    showErrorNotification,
    showUpdatedNotification,
} from '../../../utils/notifications';
import { HoldToConfirmButton } from '../../hold-to-confirm';
import './templates-section.css';

interface TemplateCardProps {
  template: SubmissionRecord;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

/**
 * Card displaying a template with edit/delete actions.
 */
export function TemplateCard({
  template,
  isSelected,
  onSelect,
}: TemplateCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(template.title ?? '');
  const [isSaving, setIsSaving] = useState(false);

  // Sync editedName when template changes (e.g., after save)
  useEffect(() => {
    if (!isEditing) {
      setEditedName(template.title ?? '');
    }
  }, [template.title, isEditing]);

  const handleSave = useCallback(async () => {
    if (!editedName.trim()) return;

    setIsSaving(true);
    try {
      await submissionApi.updateTemplateName(template.id, {
        name: editedName.trim(),
      });
      setIsEditing(false);
      showUpdatedNotification(editedName.trim());
    } catch {
      showErrorNotification(<Trans>Failed to update template name</Trans>);
    } finally {
      setIsSaving(false);
    }
  }, [editedName, template.id]);

  const handleCancel = useCallback(() => {
    setEditedName(template.title ?? '');
    setIsEditing(false);
  }, [template.title]);

  const handleDelete = useCallback(async () => {
    try {
      await submissionApi.remove([template.id]);
      showDeletedNotification(1);
    } catch {
      showDeleteErrorNotification();
    }
  }, [template.id]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSave();
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  return (
    <Card
      withBorder
      p="xs"
      radius="sm"
      className={`postybirb__templates__card ${isSelected ? 'postybirb__templates__card--selected' : ''}`}
      onClick={() => !isEditing && onSelect(template.id)}
      style={{ cursor: isEditing ? 'default' : 'pointer' }}
    >
      <Group gap="xs" wrap="nowrap">
        <ThemeIcon
          size="sm"
          variant="light"
          color={template.type === SubmissionType.FILE ? 'blue' : 'grape'}
        >
          {template.type === SubmissionType.FILE ? (
            <IconFile size={12} />
          ) : (
            <IconMessage size={12} />
          )}
        </ThemeIcon>

        {isEditing ? (
          <TextInput
            size="xs"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            style={{ flex: 1 }}
            disabled={isSaving}
          />
        ) : (
          <Text size="sm" lineClamp={1} style={{ flex: 1 }}>
            {template.title || <Trans>Untitled</Trans>}
          </Text>
        )}

        <Group gap={4} wrap="nowrap">
          {isEditing ? (
            <>
              <Tooltip label={<Trans>Save</Trans>}>
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  color="green"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSave();
                  }}
                  disabled={!editedName.trim() || isSaving}
                  loading={isSaving}
                >
                  <IconCheck size={12} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label={<Trans>Cancel</Trans>}>
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  color="gray"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancel();
                  }}
                  disabled={isSaving}
                >
                  <IconX size={12} />
                </ActionIcon>
              </Tooltip>
            </>
          ) : (
            <>
              <Tooltip label={<Trans>Rename</Trans>}>
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                >
                  <IconPencil size={12} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label={<Trans>Hold to Delete</Trans>}>
                <HoldToConfirmButton
                  size="xs"
                  variant="subtle"
                  color="red"
                  onConfirm={handleDelete}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconTrash size={12} />
                </HoldToConfirmButton>
              </Tooltip>
            </>
          )}
        </Group>
      </Group>
    </Card>
  );
}
