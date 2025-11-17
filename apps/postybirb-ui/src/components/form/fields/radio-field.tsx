import { useLingui } from '@lingui/react/macro';
import { Box, SegmentedControl } from '@mantine/core';
import { RadioFieldType, RatingFieldType } from '@postybirb/form-builder';
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
  const { t } = useLingui();
  const options =
    field.formField === 'rating' && !option.isDefault
      ? [{ label: t`Default`, value: '' }, ...field.options]
      : field.options;
  const value: string = (values[propKey] as string) || field.defaultValue || '';

  return (
    <SegmentedControl
      value={value}
      orientation={field.layout}
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
    <SegmentedControl
      value={value}
      // orientation={field.layout}
      size="xs"
      data={field.options.map((o) => ({
        label: `${o.label}${
          field.defaultValue !== undefined &&
          o.value &&
          o.value.toString() === field.defaultValue
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

export function RadioField(props: RadioFieldProps) {
  const { field } = props;
  const defaultValue = useDefaultOption<string>(props);
  const validationResult = useValidations(props);

  return (
    <FieldLabel {...props} validationState={validationResult}>
      <Box>
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
      </Box>
    </FieldLabel>
  );
}
