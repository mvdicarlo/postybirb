/**
 * FormField - Routes to the appropriate field component based on field type.
 */

import { Box } from '@mantine/core';
import type {
  BooleanFieldType,
  DateTimeFieldType,
  DescriptionFieldType,
  FieldAggregateType,
  RadioFieldType,
  RatingFieldType,
  SelectFieldType,
  TagFieldType,
  TextFieldType,
} from '@postybirb/form-builder';
import { BooleanField } from './fields/boolean-field';
import { DateTimeField } from './fields/datetime-field';
import { DescriptionField } from './fields/description-field';
import './fields/field.css';
import { InputField } from './fields/input-field';
import { RadioField } from './fields/radio-field';
import { SelectField } from './fields/select-field';
import { TagField } from './fields/tag-field';
import { useFormFieldsContext } from './form-fields-context';
import { useValidations } from './hooks/use-validations';

interface FormFieldProps {
  fieldName: string;
  field: FieldAggregateType;
}

export function FormField({ fieldName, field }: FormFieldProps) {
  const { getValue, option, submission } = useFormFieldsContext();
  const validations = useValidations(fieldName);

  // Evaluate visibility: showWhen can override hidden
  // If showWhen exists and evaluates to true, field is shown regardless of hidden
  // If showWhen exists and evaluates to false, field is hidden
  // If no showWhen and hidden is true, field is hidden
  if (field.showWhen) {
    const shouldShow = evaluateShowWhen(field, getValue, option, submission);
    if (!shouldShow) {
      return null;
    }
  } else if (field.hidden) {
    return null;
  }

  let formField: JSX.Element | null = null;
  switch (field.formField) {
    case 'description':
      formField = (
        <DescriptionField
          fieldName={fieldName}
          field={field as DescriptionFieldType}
        />
      );
      break;
    case 'input':
    case 'textarea':
      formField = (
        <InputField fieldName={fieldName} field={field as TextFieldType} />
      );
      break;
    case 'radio':
    case 'rating':
      formField = (
        <RadioField
          fieldName={fieldName}
          field={field as RadioFieldType | RatingFieldType}
        />
      );
      break;
    case 'checkbox':
      formField = (
        <BooleanField fieldName={fieldName} field={field as BooleanFieldType} />
      );
      break;
    case 'tag':
      formField = (
        <TagField fieldName={fieldName} field={field as TagFieldType} />
      );
      break;
    case 'select':
      formField = (
        <SelectField fieldName={fieldName} field={field as SelectFieldType} />
      );
      break;
    case 'datetime':
      formField = (
        <DateTimeField
          fieldName={fieldName}
          field={field as DateTimeFieldType}
        />
      );
      break;
    default:
      formField = (
        // eslint-disable-next-line lingui/no-unlocalized-strings
        <div>Unknown field type: {(field as FieldAggregateType).formField}</div>
      );
  }

  const hasErrors = validations.errors?.length;
  const hasWarnings = validations.warnings?.length;

  if (hasErrors || hasWarnings) {
    return (
      <Box
        pr={6}
        pb={3}
        pl={6}
        className={
          hasErrors ? 'postybirb-field-error' : 'postybirb-field-warning'
        }
      >
        {formField}
      </Box>
    );
  }

  return <Box>{formField}</Box>;
}

/**
 * Evaluates showWhen conditions to determine if field should be visible.
 */
function evaluateShowWhen(
  field: FieldAggregateType,
  getValue: <T>(name: string) => T,
  option: { data: unknown; isDefault?: boolean },
  submission: {
    options: Array<{ isDefault?: boolean; data: unknown }>;
  },
): boolean {
  if (!field.showWhen || field.showWhen.length === 0) return true;

  const defaultOption = submission.options.find((opt) => opt.isDefault);

  for (const [fieldName, allowedValues] of field.showWhen) {
    let currentValue = getValue(fieldName as string);

    // For rating field, fall back to default option value
    if (option !== defaultOption && fieldName === 'rating' && !currentValue) {
      const defaultData = defaultOption?.data as Record<string, unknown>;
      currentValue = defaultData?.rating as typeof currentValue;
    }

    if (!allowedValues.includes(currentValue)) {
      return false;
    }
  }

  return true;
}
