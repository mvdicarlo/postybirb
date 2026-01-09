/**
 * Hook to get validation messages for a specific field.
 */

import { ValidationMessage } from '@postybirb/types';
import { useMemo } from 'react';
import { useFormFieldsContext } from '../form-fields-context';

export interface UseValidationResult {
  warnings: ValidationMessage[];
  errors: ValidationMessage[];
  isInvalid: boolean;
}

export function useValidations(fieldName: string): UseValidationResult {
  const { option, submission } = useFormFieldsContext();

  const validationMsgs = useMemo(() => {
    // Find validation result for this option
    const validations = submission.validations.find((v) => v.id === option.id);
    const warnings: ValidationMessage[] = (validations?.warnings || []).filter(
      (warning: ValidationMessage) => warning.field === fieldName,
    );
    const errors: ValidationMessage[] = (validations?.errors || []).filter(
      (error: ValidationMessage) => error.field === fieldName,
    );

    return {
      warnings,
      errors,
      isInvalid: !!errors.length,
    };
  }, [option.id, submission.validations, fieldName]);

  return validationMsgs;
}
