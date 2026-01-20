/**
 * DescriptionField - Rich text editor for descriptions.
 */

import { Trans } from '@lingui/react/macro';
import { Box, Checkbox } from '@mantine/core';
import { DescriptionFieldType } from '@postybirb/form-builder';
import {
  DefaultDescriptionValue,
  Description,
  DescriptionValue,
} from '@postybirb/types';
import { useMemo } from 'react';
import { DescriptionEditor } from '../../../../../../shared';
import { useFormFieldsContext } from '../form-fields-context';
import { useDefaultOption } from '../hooks/use-default-option';
import { useValidations } from '../hooks/use-validations';
import { FieldLabel } from './field-label';
import { FormFieldProps } from './form-field.type';

type DescriptionBlock = Description[number];

/**
 * Recursively checks if a description contains a block of a specific type.
 */
function hasBlockType(blocks: DescriptionBlock[], blockType: string): boolean {
  for (const block of blocks) {
    if (block.type === blockType) {
      return true;
    }
    if (block.children && block.children.length > 0) {
      if (hasBlockType(block.children as DescriptionBlock[], blockType)) {
        return true;
      }
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
  const insertTags = fieldValue.insertTags || false;
  const insertTitle = fieldValue.insertTitle || false;

  // Memoize description to avoid dependency issues
  const description = useMemo(
    () => fieldValue.description || [],
    [fieldValue.description],
  );

  // Check if the description contains title or tags shortcut blocks
  const hasTitleShortcut = useMemo(
    () => hasBlockType(description, 'titleShortcut'),
    [description],
  );
  const hasTagsShortcut = useMemo(
    () => hasBlockType(description, 'tagsShortcut'),
    [description],
  );

  return (
    <Box>
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
          checked={insertTitle}
          disabled={hasTitleShortcut}
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
          checked={insertTags}
          disabled={hasTagsShortcut}
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
