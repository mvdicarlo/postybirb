/**
 * FormField - Stub component that displays field type and label.
 * Actual input implementations will be added in a future pass.
 */

import { Badge, Box, Paper, Text } from '@mantine/core';
import { FieldAggregateType } from '@postybirb/form-builder';
import { useFormFieldsContext } from './form-fields-context';

interface FormFieldProps {
  fieldName: string;
  field: FieldAggregateType;
}

export function FormField({ fieldName, field }: FormFieldProps) {
  const { getValue } = useFormFieldsContext();

  // Check showWhen condition
  if (field.showWhen) {
    const shouldShow = evaluateShowWhen(field.showWhen, getValue);
    if (!shouldShow) {
      return null;
    }
  }

  // Get the label from field metadata - handle both string and object forms
  const label =
    typeof field.label === 'string'
      ? field.label
      : field.label?.untranslated ?? fieldName;

  return (
    <Paper p="xs" withBorder>
      <Box>
        <Badge size="xs" variant="light" mb={4}>
          {field.formField}
        </Badge>
        <Text size="sm" fw={500}>
          {label}
        </Text>
      </Box>
    </Paper>
  );
}

/**
 * Evaluates showWhen conditions to determine if field should be visible.
 * showWhen is Array<[keyof T, any[]]>
 */
function evaluateShowWhen(
  showWhen: FieldAggregateType['showWhen'],
  getValue: <T>(name: string) => T,
): boolean {
  if (!showWhen || showWhen.length === 0) return true;

  // showWhen is an array of tuples: [fieldName, allowedValues[]]
  for (const [fieldName, allowedValues] of showWhen) {
    const currentValue = getValue(fieldName as string);

    // Check if current value is in the allowed values
    if (!allowedValues.includes(currentValue)) {
      return false;
    }
  }

  return true;
}
