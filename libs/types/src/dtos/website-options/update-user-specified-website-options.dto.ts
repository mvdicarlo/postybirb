import { IUserSpecifiedWebsiteOptions } from '../../models';

export type IUpdateUserSpecifiedWebsiteOptionsDto = Pick<
  IUserSpecifiedWebsiteOptions,
  'type' | 'options'
>;
