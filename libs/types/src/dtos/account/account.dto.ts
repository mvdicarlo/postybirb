import { IAccount, ILoginState } from '../../models';
import { IWebsiteInfo } from '../../models/website/website-info.interface';
import { IEntityDto } from '../database/entity.dto';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IAccountDto<T = any> = IEntityDto<IAccount> & {
  /**
   * Current login state for the account.
   * @type {ILoginState}
   */
  loginState: ILoginState;
  /**
   * Additional information
   * (I have forgotten what this is and will update when I remember).
   * @type {T}
   */
  data: T;
  /**
   * Website info for display purposes from API consumers.
   * @type {IWebsiteInfo}
   */
  websiteInfo: IWebsiteInfo;
};
