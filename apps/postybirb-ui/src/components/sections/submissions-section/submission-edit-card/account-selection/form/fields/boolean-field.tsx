/**
 * BooleanField - Checkbox field for boolean values.
 */

import { useLingui } from '@lingui/react/macro';
import { Checkbox } from '@mantine/core';
import {
    BooleanFieldType,
    FieldAggregateType,
    FieldType,
} from '@postybirb/form-builder';
import { useFormFieldsContext } from '../form-fields-context';
import { useValidations } from '../hooks/use-validations';
import { FieldLabel, getTranslatedLabel } from './field-label';
import { FormFieldProps } from './form-field.type';

export function BooleanField({
  fieldName,
  field,
}: FormFieldProps<BooleanFieldType>) {
  const { t } = useLingui();
  const { getValue, setValue } = useFormFieldsContext();
  const validations = useValidations(fieldName);

  const value = Boolean(
    getValue<boolean>(fieldName) ?? field.defaultValue ?? false,
  );

  // Create a label-less field for the wrapper (checkbox has its own label)
  const labelLessField = {
    ...field,
    label: undefined,
  } as unknown as FieldType<boolean, string>;

  return (
    <FieldLabel
      field={labelLessField as FieldAggregateType}
      fieldName={fieldName}
      validationState={validations}
    >
      <Checkbox
        checked={value}
        onChange={(event) => setValue(fieldName, event.currentTarget.checked)}
        label={getTranslatedLabel(field, t)}
      />
    </FieldLabel>
  );
}
