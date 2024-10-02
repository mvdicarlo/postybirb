import { msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import { Radio, SegmentedControl } from '@mantine/core';
import { RadioFieldType, RatingFieldType } from '@postybirb/form-builder';
import { useMemo } from 'react';
import { useDefaultOption } from '../hooks/use-default-option';
import { useValidations } from '../hooks/use-validations';
import { FieldLabel } from './field-label';
import { FormFieldProps } from './form-field.type';

type RadioFieldProps =
  | FormFieldProps<RadioFieldType>
  | FormFieldProps<RatingFieldType>;

type CommonFieldProps = {
  defaultValue: string | undefined;
};

function RatingFieldControl(
  props: FormFieldProps<RatingFieldType> & CommonFieldProps
) {
  const { propKey, field, defaultValue, option, form } = props;
  const { _ } = useLingui();
  const options = useMemo(
    () =>
      field.formField === 'rating' && !option.isDefault
        ? [{ label: _(msg`Default`), value: undefined }, ...field.options]
        : field.options,
    [_, field.formField, field.options, option.isDefault]
  );

  return (
    <SegmentedControl
      {...form.getInputProps(propKey)}
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
    />
  );
}

function InnerRadioField(
  props: FormFieldProps<RadioFieldType> & CommonFieldProps
) {
  const { propKey, field, form } = props;
  return (
    <Radio.Group {...form.getInputProps(propKey)}>
      {field.options.map((o) => (
        <Radio key={o.toString()} value={o.value as string | number} label={o.label}/>
          
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
