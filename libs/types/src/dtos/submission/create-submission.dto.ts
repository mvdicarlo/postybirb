import { SubmissionType } from '../../enums';

export interface ICreateSubmissionDto {
  name: string;
  type: SubmissionType;
  isTemplate?: boolean;
}
