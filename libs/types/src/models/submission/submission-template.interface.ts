import { Collection } from '@mikro-orm/core';
import { IWebsiteFormFields, IWebsiteOptions } from '../index';
import { SubmissionType } from '../../enums';
import { IEntity } from '../database/entity.interface';

/**
 * Represents a templated submission entity.
 * @interface ISubmissionTemplate
 * @extends {IEntity}
 */
export interface ISubmissionTemplate extends IEntity {
  /**
   * Visual name of the submission template.
   * @type {string}
   */
  name: string;

  /**
   * The type of the submission that can be paired with the template.
   * @type {SubmissionType}
   */
  type: SubmissionType;

  /**
   * The options associated with the submission template.
   * @type {Collection<IWebsiteOptions<IWebsiteFormFields>>}
   */
  options: Collection<IWebsiteOptions<IWebsiteFormFields>>;
}
