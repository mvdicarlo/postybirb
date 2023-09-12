import { ICreateWebsiteOptionsDto } from '../website-options/create-website-options.dto';

export interface IUpdateSubmissionTemplateDto {
  name: string;
  options: ICreateWebsiteOptionsDto[];
}
