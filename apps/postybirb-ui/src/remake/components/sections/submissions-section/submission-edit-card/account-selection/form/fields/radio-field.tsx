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

interface RadioFieldProps {
  fieldName: string;
  field: RadioFieldType | RatingFieldType;
}

interface RatingFieldControlProps {
  fieldName: string;
  field: RatingFieldType;
  defaultValue: string | undefined;
}

interface InnerRadioFieldProps {
  fieldName: string;
  field: RadioFieldType;
}

function RatingFieldControl({
  fieldName,
  field,
  defaultValue,
}: RatingFieldControlProps) {
  const { getValue, setValue, option } = useFormFieldsContext();
  const { t } = useLingui();

  const baseOptions = field.options;
  const options =
    field.formField === 'rating' && !option.isDefault
      ? [{ label: t`Default`, value: '' }, ...baseOptions]
      : baseOptions;
  const value = getValue<string>(fieldName) ?? field.defaultValue ?? '';

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
            ? ' *'
            : ''
        }`,
        value: o.value ? o.value.toString() : '',
      }))}
      onChange={(e) => setValue(fieldName, e)}
    />
  );
}

function InnerRadioField({ fieldName, field }: InnerRadioFieldProps) {
  const { getValue, setValue } = useFormFieldsContext();
  const value = getValue<string>(fieldName) ?? field.defaultValue ?? '';

  return (
    <SegmentedControl
      value={value}
      size="xs"
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

export function RadioField({ fieldName, field }: RadioFieldProps) {
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
            defaultValue={defaultValue}
          />
        ) : (
          <InnerRadioField
            fieldName={fieldName}
            field={field as RadioFieldType}
          />
        )}
      </Box>
    </FieldLabel>
  );
}
