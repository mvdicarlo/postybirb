/* eslint-disable @typescript-eslint/no-explicit-any */
import { UseFormReturnType } from '@mantine/form';
// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries
import { FieldAggregateType } from '@postybirb/form-builder';
import {
  IWebsiteFormFields,
  ValidationResult,
  WebsiteOptionsDto,
} from '@postybirb/types';

export type SubmissionValidationResult = {
  id: string;
  result: ValidationResult;
};

export type FormFieldProps<T = FieldAggregateType> = {
  defaultOption: WebsiteOptionsDto<IWebsiteFormFields>;
  field: T;
  form: UseFormReturnType<
    Record<string, unknown>,
    (values: Record<string, unknown>) => Record<string, unknown>
  >;
  option: WebsiteOptionsDto<never>;
  propKey: string;
  validation: SubmissionValidationResult[];
};
