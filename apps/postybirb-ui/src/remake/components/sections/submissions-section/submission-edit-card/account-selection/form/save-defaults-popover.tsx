/**
 * SaveDefaultsPopover - Popover for selecting which field values to save as account defaults.
 * Users can choose which fields to include when saving current values as future defaults.
 */

import { Trans, useLingui } from '@lingui/react/macro';
import {
    ActionIcon,
    Button,
    Checkbox,
    Group,
    Popover,
    ScrollArea,
    Stack,
    Text,
    Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { FieldAggregateType, FormBuilderMetadata } from '@postybirb/form-builder';
import { DynamicObject } from '@postybirb/types';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { useCallback, useState } from 'react';
import userSpecifiedWebsiteOptionsApi from '../../../../../../api/user-specified-website-options.api';
import { getTranslatedLabel } from './fields/field-label';
import { useFormFieldsContext } from './form-fields-context';

/**
 * Get a displayable label string from a field label for sorting purposes.
 */
function getLabelString(
  field: FieldAggregateType,
  t: ReturnType<typeof useLingui>['t'],
): string {
  return getTranslatedLabel(field, t);
}

/**
 * Popover for selecting and saving field values as account defaults.
 */
export function SaveDefaultsPopover() {
  const { t } = useLingui();
  const { formFields, option, submission } = useFormFieldsContext();
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>(
    {},
  );
  const [isSaving, setIsSaving] = useState(false);

  // Handle checkbox toggle
  const handleFieldToggle = useCallback(
    (fieldKey: string, checked: boolean) => {
      setSelectedFields((prev) => ({
        ...prev,
        [fieldKey]: checked,
      }));
    },
    [],
  );

  // Select all fields
  const handleSelectAll = useCallback(() => {
    if (!formFields) return;
    const allSelected: Record<string, boolean> = {};
    Object.keys(formFields).forEach((key) => {
      allSelected[key] = true;
    });
    setSelectedFields(allSelected);
  }, [formFields]);

  // Deselect all fields
  const handleSelectNone = useCallback(() => {
    setSelectedFields({});
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!formFields) return;

    setIsSaving(true);
    try {
      // Create a copy of current values, filtered by selected fields
      const values = option.data as unknown as Record<string, unknown>;
      const filteredOptions: DynamicObject = {};

      for (const [key, isSelected] of Object.entries(selectedFields)) {
        if (isSelected && key in values) {
          filteredOptions[key] = values[key];
        }
      }

      await userSpecifiedWebsiteOptionsApi.create({
        accountId: option.accountId,
        type: submission.type,
        options: filteredOptions,
      });

      notifications.show({
        message: <Trans>Defaults saved successfully</Trans>,
        color: 'green',
      });

      // Reset selections and close
      setSelectedFields({});
      close();
    } catch (error) {
      notifications.show({
        message:
          error instanceof Error ? (
            error.message
          ) : (
            <Trans>Failed to save defaults</Trans>
          ),
        color: 'red',
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    formFields,
    option.data,
    option.accountId,
    submission.type,
    selectedFields,
    close,
  ]);

  // Check if any fields are selected
  const hasSelectedFields = Object.values(selectedFields).some(Boolean);

  // Sort form fields alphabetically by label
  const sortedFields = formFields
    ? Object.entries(formFields as FormBuilderMetadata).sort((a, b) =>
        getLabelString(a[1], t).localeCompare(getLabelString(b[1], t)),
      )
    : [];

  // Don't show if no form fields
  if (!formFields || sortedFields.length === 0) {
    return null;
  }

  return (
    <Popover
      opened={opened}
      onClose={close}
      position="bottom-end"
      withArrow
      shadow="md"
      width={300}
    >
      <Popover.Target>
        <Tooltip label={<Trans>Save as defaults</Trans>} position="top">
          <ActionIcon variant="subtle" size="sm" onClick={open}>
            <IconDeviceFloppy size={16} />
          </ActionIcon>
        </Tooltip>
      </Popover.Target>

      <Popover.Dropdown>
        <Stack gap="sm">
          <Text size="sm" fw={500}>
            <Trans>Save as Default</Trans>
          </Text>

          <Text size="xs" c="dimmed">
            <Trans>Select fields to save as defaults for this account.</Trans>
          </Text>

          {/* Select All / None buttons */}
          <Group gap="xs">
            <Button size="compact-xs" variant="light" onClick={handleSelectAll}>
              <Trans>All</Trans>
            </Button>
            <Button
              size="compact-xs"
              variant="light"
              onClick={handleSelectNone}
            >
              <Trans>None</Trans>
            </Button>
          </Group>

          {/* Field checkboxes in scrollable area */}
          <ScrollArea.Autosize mah={250}>
            <Stack gap="xs">
              {sortedFields.map(([key, field]) => (
                <Checkbox
                  key={key}
                  size="xs"
                  label={getTranslatedLabel(field, t)}
                  checked={selectedFields[key] ?? false}
                  onChange={(e) =>
                    handleFieldToggle(key, e.currentTarget.checked)
                  }
                />
              ))}
            </Stack>
          </ScrollArea.Autosize>

          {/* Save button */}
          <Button
            size="sm"
            loading={isSaving}
            disabled={!hasSelectedFields}
            onClick={handleSave}
            fullWidth
          >
            <Trans>Save Selected</Trans>
          </Button>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
