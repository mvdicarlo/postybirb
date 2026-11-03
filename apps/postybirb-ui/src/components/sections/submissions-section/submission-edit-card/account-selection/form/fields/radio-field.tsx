/**
 * RadioField - Segmented control for radio/rating fields.
 */

import { useLingui } from '@lingui/react/macro';
import { Box, SegmentedControl } from '@mantine/core';
import { RadioFieldType, RatingFieldType } from '@postybirb/form-builder';
import { useFormFieldsContext } from '../form-fields-context';
import { useDefaultOption } from '../hooks/use-default-option';
import { useValidations } from '../hooks/use-validations';
import { FieldLabel } from './field-label';
import { FormFieldProps } from './form-field.type';

type RadioFieldProps = FormFieldProps<RadioFieldType | RatingFieldType>;

type RatingFieldControlProps = FormFieldProps<RatingFieldType> & {
  defaultValue: string | undefined;
};

type InnerRadioFieldProps = FormFieldProps<RadioFieldType>;

function RatingFieldControl({
  fieldName,
  field,
  disabled,
  defaultValue,
}: RatingFieldControlProps) {
  const { getValue, setValue, option } = useFormFieldsContext();
  const { t } = useLingui();

  const baseOptions = field.options;

  const options =
    field.formField === 'rating' && !option.isDefault
      ? [{ label: t`Default`, value: '' }, ...baseOptions]
      : baseOptions;
  const rawValue = getValue<string>(fieldName);
  // Only show "Default" when the value was never explicitly set (undefined/null/empty).
  // If the user explicitly chose a value that happens to match the default, show their choice.
  const value =
    !option.isDefault && !rawValue
      ? ''
      : (rawValue ?? field.defaultValue ?? '');

  return (
    <SegmentedControl
      value={value}
      orientation={field.layout}
      size="xs"
      disabled={disabled}
      data={options.map((o) => {
        const isInheritedRating =
          value === '' &&
          defaultValue !== undefined &&
          o.value &&
          o.value.toString() === defaultValue;

        return {
          label: (
            <Box
              component="span"
              c={
                isInheritedRating
                  ? 'var(--mantine-primary-color-filled)'
                  : undefined
              }
              bg={
                isInheritedRating
                  ? 'var(--mantine-primary-color-light)'
                  : undefined
              }
              px={4}
              style={{ borderRadius: 'var(--mantine-radius-xs)' }}
            >
              {o.label}
            </Box>
          ),
          value: o.value ? o.value.toString() : '',
        };
      })}
      onChange={(e) => setValue(fieldName, e || undefined)}
    />
  );
}

function InnerRadioField({ fieldName, field, disabled }: InnerRadioFieldProps) {
  const { getValue, setValue } = useFormFieldsContext();
  const value = getValue<string>(fieldName) ?? field.defaultValue ?? '';

  return (
    <SegmentedControl
      value={value}
      size="xs"
      fullWidth
      disabled={disabled}
      data={field.options.map((o) => ({
        label: `${o.label}${
          field.defaultValue !== undefined &&
          o.value &&
          o.value.toString() === field.defaultValue
            ? ' *'
            : ''
        }`,
        value: o.value ? o.value.toString() : '',
      }))}
      onChange={(e) => setValue(fieldName, e)}
    />
  );
}

export function RadioField({ fieldName, field, disabled }: RadioFieldProps) {
  const defaultValue = useDefaultOption<string>(fieldName);
  const validations = useValidations(fieldName);

  return (
    <FieldLabel
      field={field}
      fieldName={fieldName}
      validationState={validations}
    >
      <Box>
        {field.formField === 'rating' ? (
          <RatingFieldControl
            fieldName={fieldName}
            field={field as RatingFieldType}
            disabled={disabled}
            defaultValue={defaultValue}
          />
        ) : (
          <InnerRadioField
            fieldName={fieldName}
            field={field as RadioFieldType}
            disabled={disabled}
          />
        )}
      </Box>
    </FieldLabel>
  );
}
