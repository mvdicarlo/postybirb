/* eslint-disable lingui/text-restrictions */
/**
 * DescriptionField - Rich text editor for descriptions.
 */

import { Trans } from '@lingui/react/macro';
import { Alert, Box, Checkbox } from '@mantine/core';
import { DescriptionFieldType } from '@postybirb/form-builder';
import { DefaultDescription, DefaultDescriptionValue, DescriptionValue } from '@postybirb/types';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useMemo } from 'react';
import { DescriptionEditor } from '../../../../../../shared';
import { useFormFieldsContext } from '../form-fields-context';
import { useDefaultOption } from '../hooks/use-default-option';
import { useValidations } from '../hooks/use-validations';
import { FieldLabel } from './field-label';
import { FormFieldProps } from './form-field.type';

/**
 * Recursively checks if a description contains a specific inline content type.
 */
function hasInlineContentType(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blocks: any[],
  type: string,
): boolean {
  for (const block of blocks) {
    if (Array.isArray(block?.content)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (block.content.some((inline: any) => inline?.type === type)) {
        return true;
      }
    }
    if (
      Array.isArray(block?.children) &&
      hasInlineContentType(block.children, type)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Pattern to detect legacy shortcuts like {title}, {tags}, {cw}, {fa:username}, etc.
 */
const LEGACY_SHORTCUT_PATTERN = /\{[a-zA-Z0-9]+(?:\[[^\]]+\])?(?::[^}]+)?\}/;

/**
 * Recursively checks if a description contains legacy shortcut syntax in text nodes.
 */
function hasLegacyShortcuts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blocks: any[],
): boolean {
  for (const block of blocks) {
    if (Array.isArray(block?.content)) {
      for (const inline of block.content) {
        if (
          inline?.type === 'text' &&
          typeof inline?.text === 'string' &&
          LEGACY_SHORTCUT_PATTERN.test(inline.text)
        ) {
          return true;
        }
      }
    }
    if (Array.isArray(block?.children) && hasLegacyShortcuts(block.children)) {
      return true;
    }
  }
  return false;
}

export function DescriptionField({
  fieldName,
  field,
}: FormFieldProps<DescriptionFieldType>) {
  const { getValue, setValue, option } = useFormFieldsContext();
  const defaultOption = useDefaultOption<DescriptionValue>(fieldName);
  const validations = useValidations(fieldName);

  const fieldValue =
    getValue<DescriptionValue>(fieldName) ??
    field.defaultValue ??
    DefaultDescriptionValue();
  const overrideDefault = fieldValue.overrideDefault || false;

  // Derive effective values - if default has it enabled, it's always enabled (locked)
  const defaultInsertTitle = defaultOption?.insertTitle || false;
  const defaultInsertTags = defaultOption?.insertTags || false;
  const insertTags = fieldValue.insertTags || defaultInsertTags;
  const insertTitle = fieldValue.insertTitle || defaultInsertTitle;
  const description = useMemo(
    () => fieldValue.description || DefaultDescription(),
    [fieldValue.description],
  );

  const hasTagsShortcut = useMemo(
    () => hasInlineContentType(description.content || [], 'tagsShortcut'),
    [description],
  );

  const hasTitleShortcut = useMemo(
    () => hasInlineContentType(description.content || [], 'titleShortcut'),
    [description],
  );

  const containsLegacyShortcuts = useMemo(
    () => hasLegacyShortcuts(description.content || []),
    [description],
  );

  return (
    <Box>
      {containsLegacyShortcuts && (
        <Alert
          icon={<IconAlertTriangle size={16} />}
          title={<Trans>Legacy Shortcuts Detected</Trans>}
          color="yellow"
          mb="sm"
        >
          <Trans>
            Your description contains legacy shortcut syntax. These are no
            longer supported. Please use the new shortcut menu (type @, &lbrace;
            or &#96;) to insert shortcuts.
          </Trans>
        </Alert>
      )}
      <FieldLabel
        field={field}
        fieldName={fieldName}
        validationState={validations}
      >
        {defaultOption === undefined ? null : (
          <Checkbox
            mb="4"
            checked={overrideDefault}
            onChange={(e) => {
              setValue(fieldName, {
                ...fieldValue,
                overrideDefault: e.target.checked,
              });
            }}
            label={<Trans>Use custom description</Trans>}
          />
        )}
        <Checkbox
          mb="4"
          disabled={hasTitleShortcut || defaultInsertTitle}
          checked={insertTitle}
          onChange={(e) => {
            setValue(fieldName, {
              ...fieldValue,
              insertTitle: e.target.checked,
            });
          }}
          label={<Trans>Insert title at start</Trans>}
        />
        <Checkbox
          mb="4"
          disabled={hasTagsShortcut || defaultInsertTags}
          checked={insertTags}
          onChange={(e) => {
            setValue(fieldName, {
              ...fieldValue,
              insertTags: e.target.checked,
            });
          }}
          label={<Trans>Insert tags at end</Trans>}
        />
        {(overrideDefault || option.isDefault) && (
          <DescriptionEditor
            value={description}
            minHeight={35}
            showCustomShortcuts
            isDefaultEditor={option.isDefault}
            onChange={(value) => {
              setValue(fieldName, {
                ...fieldValue,
                description: value,
              });
            }}
          />
        )}
      </FieldLabel>
    </Box>
  );
}
