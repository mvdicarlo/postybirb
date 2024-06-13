import { useLingui } from '@lingui/react';
import { Checkbox } from '@mantine/core';
import { BooleanFieldType } from '@postybirb/form-builder';
import { getTranslatedLabel } from './field-label';
import { FormFieldProps } from './form-field.type';

export function BooleanField(props: FormFieldProps<BooleanFieldType>) {
  const { propKey, field, form } = props;
  const { _ } = useLingui();
  return (
    <Checkbox
      {...form.getInputProps(propKey)}
      label={getTranslatedLabel(field, _)}
    />
  );
}
