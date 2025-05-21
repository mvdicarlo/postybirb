import { useLingui } from '@lingui/react';
import { Checkbox } from '@mantine/core';
import {
  BooleanFieldType,
  FieldAggregateType,
  FieldType,
} from '@postybirb/form-builder';
import { useValidations } from '../hooks/use-validations';
import { useFormFields } from '../website-option-form/use-form-fields';
import { FieldLabel, getTranslatedLabel } from './field-label';
import { FormFieldProps } from './form-field.type';

export function BooleanField(props: FormFieldProps<BooleanFieldType>) {
  const { field, propKey } = props;
  const { _ } = useLingui();
  const { values, setFieldValue } = useFormFields();
  const validations = useValidations(props);

  // Ensure value is explicitly cast to boolean
  const value = Boolean(
    values[propKey] !== undefined
      ? values[propKey]
      : field.defaultValue || false,
  );

  const labelLessField = {
    ...field,
    label: undefined,
  } as unknown as FieldType<boolean, string>;

  return (
    <FieldLabel
      {...props}
      field={labelLessField as FieldAggregateType}
      validationState={validations}
    >
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
