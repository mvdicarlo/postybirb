/**
 * Hook to get the default option value for a field.
 */

import { IWebsiteFormFields } from '@postybirb/types';
import { useFormFieldsContext } from '../form-fields-context';

export function useDefaultOption<T>(fieldName: string): T | undefined {
  const { option, submission } = useFormFieldsContext();

  // Find the default option
  const defaultOption = submission.options.find((opt) => opt.isDefault);

  if (!defaultOption || defaultOption === option) {
    return undefined;
  }

  const defaultValue =
    defaultOption.data[fieldName as keyof IWebsiteFormFields];
  return defaultValue as T | undefined;
}
