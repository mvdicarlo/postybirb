import { SubmissionType } from '../../enums';
import { IAccount, ILoginState } from '../../models';
import { WebsiteFileOptions } from '../../website-modifiers/website-file-options';
import { IEntityDto } from '../database/entity.dto';

export interface IAccountInstanceCapabilities {
  websiteDisplayName: string;
  supports: SubmissionType[];
  fileOptions?: WebsiteFileOptions;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IAccountDto<T = any> = IEntityDto<IAccount> & {
  /**
   * Current login state for the account.
   * @type {ILoginState}
   */
  state: ILoginState;

  /**
   * Additional information from website data entity.
   * @type {T}
   */
  data: T;

  /**
   * Account-specific capabilities discovered by the runtime Website instance.
   */
  instanceCapabilities: IAccountInstanceCapabilities;
};
