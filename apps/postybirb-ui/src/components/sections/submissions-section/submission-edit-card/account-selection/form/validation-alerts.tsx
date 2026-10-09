/**
 * ValidationAlerts - Displays non-field-specific validation messages.
 * Shows errors and warnings that don't belong to a specific form field.
 */

import { Alert, Stack } from '@mantine/core';
import { IconAlertCircle, IconAlertTriangle } from '@tabler/icons-react';
import { useMemo } from 'react';
import { ValidationTranslation } from '../../../../../../i18n/validation-translation';
import { useFormFieldsContext } from './form-fields-context';

/**
 * Component to display validation alerts for non-field-specific messages.
 */
export function ValidationAlerts() {
  const { option, submission, formFields } = useFormFieldsContext();

  const { errors, warnings } = useMemo(() => {
    // Find validation result for this option
    const validations = submission.validations.find((v) => v.id === option.id);

    // Filter out field-specific messages - we only want messages that:
    // 1. Have no field property, OR
    // 2. Have a field property that doesn't correspond to an actual form field
    const isNonFormField = (
      fieldName: string | number | symbol | undefined,
    ) => {
      if (!fieldName) return true; // No field specified
      if (!formFields) return true; // No form fields loaded yet
      if (typeof fieldName !== 'string') return true; // Only string fields are valid
      return !formFields[fieldName]; // Field doesn't exist in form
    };

    const nonFieldErrors = (validations?.errors || []).filter((error) =>
      isNonFormField(error.field),
    );
    const nonFieldWarnings = (validations?.warnings || []).filter((warning) =>
      isNonFormField(warning.field),
    );

    return {
      errors: nonFieldErrors,
      warnings: nonFieldWarnings,
    };
  }, [option.id, submission.validations, formFields]);

  // Don't render anything if there are no non-field messages
  if (errors.length === 0 && warnings.length === 0) {
    return null;
  }

  return (
    <Stack gap="xs">
      {errors.map((error, index) => (
        <Alert
          // eslint-disable-next-line react/no-array-index-key
          key={`error-${error.id}-${index}`}
          variant="light"
          color="red"
          p="xs"
          styles={{ title: { fontSize: 'sm' }, message: { fontSize: 'sm' } }}
          icon={<IconAlertCircle size={16} />}
        >
          <ValidationTranslation id={error.id} values={error.values} />
        </Alert>
      ))}
      {warnings.map((warning, index) => (
        <Alert
          // eslint-disable-next-line react/no-array-index-key
          key={`warning-${warning.id}-${index}`}
          variant="light"
          color="yellow"
          p="xs"
          styles={{ title: { fontSize: 'sm' }, message: { fontSize: 'sm' } }}
          icon={<IconAlertTriangle size={16} />}
        >
          <ValidationTranslation id={warning.id} values={warning.values} />
        </Alert>
      ))}
    </Stack>
  );
}
