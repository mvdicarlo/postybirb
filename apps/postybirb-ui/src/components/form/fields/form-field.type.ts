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
  option: WebsiteOptionsDto;
  propKey: string;
  validation: ValidationResult[];
};
