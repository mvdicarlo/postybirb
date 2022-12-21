import { IAccountDto } from '@postybirb/dto';
import {
  FieldAggregateType,
  FormBuilderMetadata,
} from '@postybirb/form-builder';
import { ISubmissionOptions } from '@postybirb/types';
import { SubmissionDto } from '../../../models/dtos/submission.dto';

export type SubmissionFormProps = {
  onUpdate: () => void;
  submission: SubmissionDto;
};

export type SubmissionSectionProps = SubmissionFormProps & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  option: ISubmissionOptions<any>;
  account?: IAccountDto;
};

export type SubmissionGeneratorProps = SubmissionSectionProps & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: FormBuilderMetadata<any> | undefined;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SubmissionGeneratedFieldProps<T = FieldAggregateType<any>> =
  SubmissionSectionProps & {
    field: T;
    propKey: string;
  };
