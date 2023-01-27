import { IBaseWebsiteOptions } from '@postybirb/types';
import { SubmissionGeneratedFieldProps } from '../../../submission-form-props';

export default function useDefaultOption<T>(
  props: SubmissionGeneratedFieldProps
): T {
  const { propKey, option, defaultOptions } = props;
  return (defaultOptions !== option &&
  defaultOptions.data[propKey as keyof IBaseWebsiteOptions] !== undefined
    ? defaultOptions.data[propKey as keyof IBaseWebsiteOptions]
    : undefined) as unknown as T;
}
