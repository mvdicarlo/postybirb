import { Input } from '@mantine/core';
import { TextFieldType } from '@postybirb/form-builder';
import { useDefaultOption } from '../hooks/use-default-option';
import { FormFieldProps } from './form-field.type';

export function InputField(props: FormFieldProps<TextFieldType>) {
  const { propKey, option, form } = props;
  const defaultValue = useDefaultOption<string>(props);
  const value = option.data[propKey] || undefined;
  return (
    <Input
      value={value}
      placeholder={defaultValue}
      onBlur={(e) => {
        form.setFieldValue(propKey, e.target.value.trim());
      }}
    />
  );
}
