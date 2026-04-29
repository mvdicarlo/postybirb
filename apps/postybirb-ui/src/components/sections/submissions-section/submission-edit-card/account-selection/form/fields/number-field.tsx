/**
 * NumberField - Numeric input field.
 */

import { NumberInput } from '@mantine/core';
import { NumberFieldType } from '@postybirb/form-builder';
import { useFormFieldsContext } from '../form-fields-context';
import { useDefaultOption } from '../hooks/use-default-option';
import { useValidations } from '../hooks/use-validations';
import { FieldCopyButton } from './field-copy-button';
import { FieldLabel } from './field-label';
import { FormFieldProps } from './form-field.type';

export function NumberField({
  fieldName,
  field,
}: FormFieldProps<NumberFieldType>) {
  const { getValue, setValue, submission } = useFormFieldsContext();
  const defaultValue = useDefaultOption<number>(fieldName);
  const validations = useValidations(fieldName);

  const value = getValue<number>(fieldName) ?? field.defaultValue ?? undefined;

  return (
    <FieldLabel
      field={field}
      fieldName={fieldName}
      validationState={validations}
    >
      <NumberInput
        value={value}
        required={field.required}
        placeholder={defaultValue !== undefined ? String(defaultValue) : undefined}
        w="100%"
        min={field.min}
        max={field.max}
        disabled={submission.isArchived}
        rightSection={<FieldCopyButton value={value !== undefined ? String(value) : ''} />}
        onChange={(val) => setValue(fieldName, val === '' ? undefined : val)}
      />
    </FieldLabel>
  );
}
