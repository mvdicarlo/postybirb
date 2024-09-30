import { MultiSelect, Select } from '@mantine/core';
import { SelectFieldType } from '@postybirb/form-builder';
import { useValidations } from '../hooks/use-validations';
import { FieldLabel } from './field-label';
import { FormFieldProps } from './form-field.type';

export function SelectField(props: FormFieldProps<SelectFieldType>) {
  const { field, form, propKey } = props;
  const validations = useValidations(props);
  const valueProps = form.getInputProps(propKey);
  const options = field.options.map((o) => ({
    value: o.value,
    label: o.label,
  }));

  return (
    <FieldLabel {...props} validationState={validations}>
      {field.allowMultiple ? (
        <MultiSelect
          clearable
          required={field.required}
          {...valueProps}
          data={options}
        />
      ) : (
        <Select
          clearable
          required={field.required}
          {...valueProps}
          data={options}
        />
      )}
    </FieldLabel>
  );
}
