/* eslint-disable @typescript-eslint/no-explicit-any */
import { UseFormReturnType } from '@mantine/form';
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

export type FormFieldProps<T = FieldAggregateType<never>> = {
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
