/**
 * InputField - Text input and textarea field.
 */

import { Group, Text, Textarea, TextInput } from '@mantine/core';
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
  const { getValue, setValue, submission } = useFormFieldsContext();
  const value = getValue<string>(fieldName) ?? field.defaultValue ?? '';
  const inputLength = (value || defaultValue)?.length ?? 0;
  return (
    <TextInput
      value={value}
      required={field.required}
      placeholder={defaultValue}
      w="100%"
      maxLength={field.maxLength}
      disabled={submission.isArchived}
      rightSection={
        <Group wrap="nowrap" gap="4">
          <FieldCopyButton value={value} />
          {inputLength > 0 && (
            <Text
              c="dimmed"
              size="xs"
              w="max-content"
              pr={field.maxLength ? 40 : 'md'}
            >
              {field.maxLength
                ? `${inputLength} / ${field.maxLength}`
                : inputLength}
            </Text>
          )}
        </Group>
      }
      onChange={(e) => setValue(fieldName, e.currentTarget.value)}
    />
  );
}

function TextAreaField({
  fieldName,
  field,
  defaultValue,
}: FormFieldProps<TextFieldType> & { defaultValue: string | undefined }) {
  const { getValue, setValue, submission } = useFormFieldsContext();
  const value = getValue<string>(fieldName) ?? field.defaultValue ?? '';

  return (
    <Textarea
      value={value}
      required={field.required}
      placeholder={defaultValue}
      w="100%"
      maxLength={field.maxLength}
      disabled={submission.isArchived}
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
