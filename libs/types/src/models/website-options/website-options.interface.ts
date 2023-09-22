import { IAccount } from '../account/account.interface';
import { IEntity } from '../database/entity.interface';
import { ISubmissionMetadata } from '../submission/submission-metadata.interface';
import { ISubmission } from '../submission/submission.interface';
import { IWebsiteFormFields } from '../submission/website-form-fields.interface';

/**
 * Represents options associated with a submission per account.
 * @interface IWebsiteOptions
 * @template T - The type of fields associated with the submission.
 * @extends {IEntity}
 */
export interface IWebsiteOptions<
  T extends IWebsiteFormFields = IWebsiteFormFields
> extends IEntity {
  /**
   * The submission associated with the options.
   * @type {ISubmission<ISubmissionMetadata>}
   */
  submission: ISubmission<ISubmissionMetadata>;

  /**
   * The fields associated with the options.
   * @type {T}
   */
  data: T;

  /**
   * The account associated with the options.
   * @type {IAccount}
   */
  account: IAccount;

  /**
   * Indicates whether the the entity as targeting default options.
   * @type {boolean}
   */
  isDefault: boolean;
}
