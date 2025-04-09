import { msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import { Radio, SegmentedControl } from '@mantine/core';
import { RadioFieldType, RatingFieldType } from '@postybirb/form-builder';
import { useMemo } from 'react';
import { useDefaultOption } from '../hooks/use-default-option';
import { useValidations } from '../hooks/use-validations';
import { useFormFields } from '../website-option-form/use-form-fields';
import { FieldLabel } from './field-label';
import { FormFieldProps } from './form-field.type';

type RadioFieldProps =
  | FormFieldProps<RadioFieldType>
  | FormFieldProps<RatingFieldType>;

type CommonFieldProps = {
  defaultValue: string | undefined;
};

function RatingFieldControl(
  props: FormFieldProps<RatingFieldType> & CommonFieldProps,
) {
  const { propKey, field, defaultValue, option } = props;
  const { values, setFieldValue } = useFormFields();
  const { _ } = useLingui();
  const options = useMemo(
    () =>
      field.formField === 'rating' && !option.isDefault
        ? [{ label: _(msg`Default`), value: undefined }, ...field.options]
        : field.options,
    [_, field.formField, field.options, option.isDefault],
  );
  const value: string = (values[propKey] as string) || field.defaultValue || '';

  return (
    <SegmentedControl
      value={value}
      orientation="vertical"
      size="xs"
      data={options.map((o) => ({
        label: `${o.label}${
          defaultValue !== undefined &&
          o.value &&
          o.value.toString() === defaultValue
            ? ` *`
            : ''
        }`,
        value: o.value ? o.value.toString() : '',
      }))}
      onChange={(e) => {
        setFieldValue(propKey, e);
      }}
    />
  );
}

function InnerRadioField(
  props: FormFieldProps<RadioFieldType> & CommonFieldProps,
) {
  const { propKey, field } = props;
  const { values, setFieldValue } = useFormFields();
  const value: string = (values[propKey] as string) || field.defaultValue || '';

  return (
    <Radio.Group value={value} onChange={(e) => setFieldValue(propKey, e)}>
      {field.options.map((o) => (
        <Radio
          key={o.toString()}
          value={o.value as string | number}
          label={o.label}
        />
      ))}
    </Radio.Group>
  );
}

export function RadioField(props: RadioFieldProps) {
  const { field } = props;
  const defaultValue = useDefaultOption<string>(props);
  const validationResult = useValidations(props);

  return (
    <FieldLabel {...props} validationState={validationResult}>
      {field.formField === 'rating' ? (
        <RatingFieldControl
          {...(props as FormFieldProps<RatingFieldType>)}
          defaultValue={defaultValue}
        />
      ) : (
        <InnerRadioField
          {...(props as FormFieldProps<RadioFieldType>)}
          defaultValue={defaultValue}
        />
      )}
    </FieldLabel>
  );
}
