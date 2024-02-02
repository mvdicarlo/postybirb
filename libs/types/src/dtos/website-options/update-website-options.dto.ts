import { IWebsiteOptions, IWebsiteFormFields } from '../../models';

export type IUpdateWebsiteOptionsDto<T extends IWebsiteFormFields> = Pick<
  IWebsiteOptions<T>,
  'data'
>;
