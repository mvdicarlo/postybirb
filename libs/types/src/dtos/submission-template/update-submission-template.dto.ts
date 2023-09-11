import { IWebsiteFormFields } from '../../models';
import { WebsiteOptionsDto } from '../website-options/website-options.dto';

export interface IUpdateSubmissionTemplateDto {
  name: string;
  options: WebsiteOptionsDto<IWebsiteFormFields>[];
}
