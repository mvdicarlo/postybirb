import { AccountId } from '../account/account.type';

/**
 * Data structure for login request.
 * @interface LoginRequestData
 */
export type LoginRequestData = {
  /**
   * Account ID.
   * @type {AccountId}
   */
  accountId: AccountId;
};
