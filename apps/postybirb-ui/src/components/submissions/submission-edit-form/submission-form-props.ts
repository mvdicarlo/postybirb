/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  FieldAggregateType,
  FormBuilderMetadata,
} from '@postybirb/form-builder';
import {
  IAccountDto,
  IWebsiteFormFields,
  ValidationResult,
  WebsiteOptionsDto,
} from '@postybirb/types';

export type SubmissionSectionProps = {
  option: WebsiteOptionsDto<any>;
  defaultOption: WebsiteOptionsDto<IWebsiteFormFields>;
  validation: SubmissionValidationResult[];
};

export type SubmissionGeneratorProps = SubmissionSectionProps & {
  account: IAccountDto;
  metadata: FormBuilderMetadata<any> | undefined;
  onUpdate: () => void;
};

export type SubmissionGeneratedFieldProps<T = FieldAggregateType<any>> =
  SubmissionGeneratorProps & {
    field: T;
    propKey: string;
  };

export type SubmissionValidationResult = {
  id: string;
  result: ValidationResult<object>;
};
