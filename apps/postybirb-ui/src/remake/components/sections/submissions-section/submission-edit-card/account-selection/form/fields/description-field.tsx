/**
 * DescriptionField - Rich text editor for descriptions.
 */

import { Trans } from '@lingui/react/macro';
import { Box, Checkbox, Textarea } from '@mantine/core';
import { DescriptionFieldType } from '@postybirb/form-builder';
import { DefaultDescriptionValue, DescriptionValue } from '@postybirb/types';
import { useFormFieldsContext } from '../form-fields-context';
import { useDefaultOption } from '../hooks/use-default-option';
import { useValidations } from '../hooks/use-validations';
import { FieldLabel } from './field-label';
import { FormFieldProps } from './form-field.type';

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
  const description = fieldValue.description || [];

  // Convert description blocks to plain text for now (simplified)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const descriptionText = (description as any[])
    .map((block) => {
      if (block.children && Array.isArray(block.children)) {
        return block.children
          .map((child: { text?: string }) => child.text || '')
          .join('');
      }
      return '';
    })
    .join('\n');

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
          onChange={(e) => {
            setValue(fieldName, {
              ...fieldValue,
              insertTags: e.target.checked,
            });
          }}
          label={<Trans>Insert tags at end</Trans>}
        />
        {(overrideDefault || option.isDefault) && (
          <Textarea
            value={descriptionText}
            onChange={(e) => {
              // Convert plain text back to description format
              const newDescription = e.currentTarget.value
                .split('\n')
                .map((line) => ({
                  type: 'paragraph',
                  children: [{ text: line }],
                }));
              setValue(fieldName, {
                ...fieldValue,
                description: newDescription,
              });
            }}
            minRows={4}
            autosize
          />
        )}
      </FieldLabel>
    </Box>
  );
}
