import { IWebsiteFormFields } from '@postybirb/types';
import { SubmissionGeneratedFieldProps } from '../../../submission-form-props';

export default function useDefaultOption<T>(
  props: SubmissionGeneratedFieldProps
): T {
  const { propKey, option, defaultOptions } = props;
  return (defaultOptions !== option &&
  defaultOptions.data[propKey as keyof IWebsiteFormFields] !== undefined
    ? defaultOptions.data[propKey as keyof IWebsiteFormFields]
    : undefined) as unknown as T;
}
