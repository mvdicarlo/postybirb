import { UseFormReturnType } from '@mantine/form';
import type { FieldAggregateType } from '@postybirb/form-builder';
import {
  IWebsiteFormFields,
  ValidationResult,
  WebsiteOptionsDto,
} from '@postybirb/types';
import { SubmissionDto } from '../../../models/dtos/submission.dto';

export type FormFieldProps<T = FieldAggregateType> = {
  submission: SubmissionDto;
  defaultOption: WebsiteOptionsDto<IWebsiteFormFields>;
  field: T;
  form: UseFormReturnType<
    Record<string, unknown>,
    (values: Record<string, unknown>) => Record<string, unknown>
  >;
  option: WebsiteOptionsDto<never>;
  propKey: string;
  validation: ValidationResult[];
};
