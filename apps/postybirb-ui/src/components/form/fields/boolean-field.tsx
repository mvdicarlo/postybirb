import { useLingui } from '@lingui/react';
import { Checkbox } from '@mantine/core';
import { BooleanFieldType, FieldType } from '@postybirb/form-builder';
import { useValidations } from '../hooks/use-validations';
import { useFormFields } from '../website-option-form/use-form-fields';
import { FieldLabel, getTranslatedLabel } from './field-label';
import { FormFieldProps } from './form-field.type';

export function BooleanField(props: FormFieldProps<BooleanFieldType>) {
  const { field, propKey } = props;
  const { _ } = useLingui();
  const { values, setFieldValue } = useFormFields();
  const validations = useValidations(props);
  // Get value from field with appropriate fallbacks
  const value: boolean =
    values[propKey] !== undefined
      ? (values[propKey] as boolean)
      : field.defaultValue || false;

  const labelLessField = {
    ...field,
    label: undefined,
  } as unknown as FieldType<boolean, string>;

  return (
    <FieldLabel {...props} field={labelLessField} validationState={validations}>
      <Checkbox
        checked={value}
        onChange={(event) =>
          setFieldValue(propKey, event.currentTarget.checked)
        }
        label={getTranslatedLabel(field, _)}
      />
    </FieldLabel>
  );
}
