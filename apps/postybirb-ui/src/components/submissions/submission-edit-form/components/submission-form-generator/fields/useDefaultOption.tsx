import { IWebsiteFormFields } from '@postybirb/types';
import { SubmissionGeneratedFieldProps } from '../../../submission-form-props';

export default function useDefaultOption<T>(
  props: SubmissionGeneratedFieldProps
): T {
  const { propKey, option, defaultOption } = props;
  return (defaultOption !== option &&
  defaultOption.data[propKey as keyof IWebsiteFormFields] !== undefined
    ? defaultOption.data[propKey as keyof IWebsiteFormFields]
    : undefined) as unknown as T;
}
