import { SubmissionType } from '../../enums';
import { IAccount } from '../account/account.interface';
import { DynamicObject } from '../common/dynamic-object';
import { IEntity } from '../database/entity.interface';

/**
 * Represents default website options set for an account by a user.
 * @interface IUserSpecifiedWebsiteOptions
 * @extends {IEntity}
 */
export interface IUserSpecifiedWebsiteOptions extends IEntity {
  /**
   * The account the options are tied to.
   * @type {IAccount}
   */
  account: IAccount;

  /**
   * The {SubmissionType} that the defaults are applied to.
   * @type {SubmissionType}
   */
  type: SubmissionType;

  /**
   * The option defaults to be applied.
   * @type {DynamicObject}
   */
  options: DynamicObject;
}
