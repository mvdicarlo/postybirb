import { BaseWebsiteOptions } from '@postybirb/types';
import { SubmissionGeneratedFieldProps } from '../../../submission-form-props';

export default function useDefaultOption<T>(
  props: SubmissionGeneratedFieldProps
): T {
  const { propKey, option, defaultOptions } = props;
  return (defaultOptions !== option &&
  defaultOptions.data[propKey as keyof BaseWebsiteOptions] !== undefined
    ? defaultOptions.data[propKey as keyof BaseWebsiteOptions]
    : undefined) as unknown as T;
}
