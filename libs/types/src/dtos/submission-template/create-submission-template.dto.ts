import { SubmissionType } from '../../enums';
import { ICreateWebsiteOptionsDto } from '../website-options/create-website-options.dto';

export type ICreateSubmissionTemplateDto = {
  name: string;
  type: SubmissionType;
  options: ICreateWebsiteOptionsDto[];
};
