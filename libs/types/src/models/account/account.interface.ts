import { EntityId, IEntity } from '../database/entity.interface';
import { WebsiteId } from '../website/website.type';

export type AccountId = EntityId;

/**
 * Represents an account with its associated properties.
 */
export interface IAccount extends IEntity {
  /**
   * The unique identifier of the account and the session partition key.
   * @type {AccountId}
   */
  id: AccountId;

  /**
   * The display name of the account.
   * @type {string}
   */
  name: string;

  /**
   * The website associated with the account.
   * @type {WebsiteId}
   */
  website: WebsiteId;

  /**
   * The list of tags that the account is associated with.
   * @type {string[]}
   */
  groups: string[];

  /**
   * The id of the submission template whose options populate default values
   * for FILE submissions made with this account.
   * @type {(EntityId | null)}
   */
  defaultFileTemplateId?: EntityId | null;

  /**
   * The id of the submission template whose options populate default values
   * for MESSAGE submissions made with this account.
   * @type {(EntityId | null)}
   */
  defaultMessageTemplateId?: EntityId | null;
}

export const NULL_ACCOUNT_ID = 'NULL_ACCOUNT';

export class NullAccount implements IAccount {
  id: AccountId = NULL_ACCOUNT_ID;

  name: string = NULL_ACCOUNT_ID;

  website: WebsiteId = 'default';

  groups: string[] = [];

  defaultFileTemplateId: EntityId | null = null;

  defaultMessageTemplateId: EntityId | null = null;

  createdAt!: string;

  updatedAt!: string;
}
