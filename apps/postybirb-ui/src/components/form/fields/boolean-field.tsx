import { useLingui } from '@lingui/react';
import { Checkbox } from '@mantine/core';
import { BooleanFieldType } from '@postybirb/form-builder';
import { getTranslatedLabel } from './field-label';
import { FormFieldProps } from './form-field.type';

export function BooleanField(props: FormFieldProps<BooleanFieldType>) {
  const { propKey, field, form } = props;
  const { _ } = useLingui();
  const valueProps = form.getInputProps(propKey);
  return (
    <Checkbox
      {...valueProps}
      defaultChecked={valueProps.defaultValue || false}
      label={getTranslatedLabel(field, _)}
    />
  );
}
