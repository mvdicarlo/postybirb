/* eslint-disable @typescript-eslint/no-explicit-any */
import { IAccountDto } from '@postybirb/dto';
import {
  FieldAggregateType,
  FormBuilderMetadata,
} from '@postybirb/form-builder';
import {
  IWebsiteFormFields,
  WebsiteOptionsDto,
  ValidationResult,
} from '@postybirb/types';
import { SubmissionDto } from '../../../models/dtos/submission.dto';

export type SubmissionFormProps = {
  onUpdate: () => void;
  submission: SubmissionDto;
  validation: SubmissionValidationResult[];
};

export type SubmissionSectionProps = SubmissionFormProps & {
  option: WebsiteOptionsDto<any>;
  defaultOptions: WebsiteOptionsDto<IWebsiteFormFields>;
  account?: IAccountDto;
};

export type SubmissionGeneratorProps = SubmissionSectionProps & {
  metadata: FormBuilderMetadata<any> | undefined;
};

export type SubmissionGeneratedFieldProps<T = FieldAggregateType<any>> =
  SubmissionSectionProps & {
    field: T;
    propKey: string;
  };

export type SubmissionValidationResult = {
  id: string;
  result: ValidationResult<object>;
};
