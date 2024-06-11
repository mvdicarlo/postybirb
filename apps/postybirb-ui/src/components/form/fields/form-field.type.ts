/* eslint-disable @typescript-eslint/no-explicit-any */
import { UseFormReturnType } from '@mantine/form';
import { FieldAggregateType } from '@postybirb/form-builder';
import { IWebsiteFormFields, WebsiteOptionsDto } from '@postybirb/types';
import { SubmissionValidationResult } from '../../submissions/submission-edit-form/submission-form-props';

export type FormFieldProps<T = FieldAggregateType<any>> = {
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
