import { IWebsiteFormFields } from '@postybirb/types';
import { FormFieldProps } from '../fields/form-field.type';

export function useDefaultOption<T>(props: FormFieldProps): T {
  const { propKey, option, defaultOption } = props;
  return (defaultOption !== option &&
  defaultOption.data[propKey as keyof IWebsiteFormFields] !== undefined
    ? defaultOption.data[propKey as keyof IWebsiteFormFields]
    : undefined) as unknown as T;
}
