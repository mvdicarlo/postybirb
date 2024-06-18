import {
  TextInput,
  Textarea,
} from '@mantine/core';
import { TextFieldType } from '@postybirb/form-builder';
import { useDefaultOption } from '../hooks/use-default-option';
import { useValidations } from '../hooks/use-validations';
import { FieldCopyButton } from './field-copy-button';
import { FieldLabel } from './field-label';
import { FormFieldProps } from './form-field.type';

type CommonFieldProps = {
  defaultValue: string | undefined;
};

function TextField(props: FormFieldProps<TextFieldType> & CommonFieldProps) {
  const { propKey, form, field, defaultValue } = props;
  const inputProps = form.getInputProps(propKey);
  const value = inputProps.value || '';
  return (
    <TextInput
      {...inputProps}
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
    />
  );
}

function TextAreaField(
  props: FormFieldProps<TextFieldType> & CommonFieldProps
) {
  const { propKey, form, field, defaultValue } = props;
  const inputProps = form.getInputProps(propKey);
  const value = inputProps.value || '';

  return (
    <Textarea
      {...inputProps}
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
    />
  );
}

export function InputField(props: FormFieldProps<TextFieldType>) {
  const { field } = props;
  const defaultValue = useDefaultOption<string>(props);
  const { errors, warnings, isInvalid } = useValidations(props);
  return (
    <FieldLabel {...props} validationState={{ errors, warnings, isInvalid }}>
      {field.formField === 'input' ? (
        <TextField {...props} defaultValue={defaultValue} />
      ) : (
        <TextAreaField {...props} defaultValue={defaultValue} />
      )}
    </FieldLabel>
  );
}
