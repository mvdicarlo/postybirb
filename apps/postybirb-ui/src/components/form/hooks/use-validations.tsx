import { ValidationMessage } from '@postybirb/types';
import { useMemo } from 'react';
import { FormFieldProps } from '../fields/form-field.type';

export type UseValidationResult = {
  warnings: ValidationMessage[];
  errors: ValidationMessage[];
  isInvalid: boolean;
};

export function useValidations(props: FormFieldProps): UseValidationResult {
  const { validation, option, propKey } = props;
  const validationMsgs = useMemo(() => {
    const validations = validation.find((v) => v.id === option.id);
    const warnings: ValidationMessage[] = (
      validations?.result.warnings || []
    ).filter((warning) => warning.field === propKey);
    const errors: ValidationMessage[] = (
      validations?.result.errors || []
    ).filter((error) => error.field === propKey);

    return {
      warnings,
      errors,
      isInvalid: !!errors.length,
    };
  }, [option.id, validation, propKey]);

  return validationMsgs;
}
