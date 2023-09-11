import { ISubmissionTemplate, IWebsiteFormFields } from '../../models';
import { IEntityDto } from '../database/entity.dto';
import { WebsiteOptionsDto } from '../website-options/website-options.dto';

export type ISubmissionTemplateDto = IEntityDto<
  Omit<ISubmissionTemplate, 'options'>
> & {
  options: WebsiteOptionsDto<IWebsiteFormFields>[];
};
