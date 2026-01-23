/**
 * InputField - Text input and textarea field.
 */

import { Textarea, TextInput } from '@mantine/core';
import { TextFieldType } from '@postybirb/form-builder';
import { useFormFieldsContext } from '../form-fields-context';
import { useDefaultOption } from '../hooks/use-default-option';
import { useValidations } from '../hooks/use-validations';
import { FieldCopyButton } from './field-copy-button';
import { FieldLabel } from './field-label';
import { FormFieldProps } from './form-field.type';

function TextField({
  fieldName,
  field,
  defaultValue,
}: FormFieldProps<TextFieldType> & { defaultValue: string | undefined }) {
  const { getValue, setValue } = useFormFieldsContext();
  const value = getValue<string>(fieldName) ?? field.defaultValue ?? '';

  return (
    <TextInput
      value={value}
      required={field.required}
      placeholder={defaultValue}
      w="100%"
      maxLength={field.maxLength}
      description={
        field.maxLength
          ? `${value?.length ?? 0} / ${field.maxLength}`
          : undefined
      }
      rightSection={<FieldCopyButton value={value} />}
      onChange={(e) => setValue(fieldName, e.currentTarget.value)}
    />
  );
}

function TextAreaField({
  fieldName,
  field,
  defaultValue,
}: FormFieldProps<TextFieldType> & { defaultValue: string | undefined }) {
  const { getValue, setValue } = useFormFieldsContext();
  const value = getValue<string>(fieldName) ?? field.defaultValue ?? '';

  return (
    <Textarea
      value={value}
      required={field.required}
      placeholder={defaultValue}
      w="100%"
      maxLength={field.maxLength}
      description={
        field.maxLength
          ? `${value?.length ?? 0} / ${field.maxLength}`
          : undefined
      }
      rightSection={<FieldCopyButton value={value} />}
      onChange={(e) => setValue(fieldName, e.currentTarget.value)}
    />
  );
}

export function InputField({
  fieldName,
  field,
}: FormFieldProps<TextFieldType>) {
  const defaultValue = useDefaultOption<string>(fieldName);
  const validations = useValidations(fieldName);

  return (
    <FieldLabel
      field={field}
      fieldName={fieldName}
      validationState={validations}
    >
      {field.formField === 'input' ? (
        <TextField
          fieldName={fieldName}
          field={field}
          defaultValue={defaultValue}
        />
      ) : (
        <TextAreaField
          fieldName={fieldName}
          field={field}
          defaultValue={defaultValue}
        />
      )}
    </FieldLabel>
  );
}
