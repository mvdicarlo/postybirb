import { SubmissionType } from '../../enums';

export type ICreateSubmissionTemplateDto = {
  name: string;
  type: SubmissionType;
};
