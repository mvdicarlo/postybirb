/**
 * Types for website login view components.
 */

import type { AccountRecord } from '../../stores/records/account-record';
import type { WebsiteRecord } from '../../stores/records/website-record';
import { WithNotifyLoginSuccessProp } from '../sections/accounts-section/accounts-content';

/**
 * Props passed to custom login view components.
 * @template T - Type of website-specific account data
 */
export interface LoginViewProps<
  T = unknown,
> extends WithNotifyLoginSuccessProp {
  /** The account being logged into */
  account: AccountRecord;
  /** The website configuration */
  website: WebsiteRecord;
  /** Website-specific data stored on the account (typed) */
  data: T | undefined;
}

/**
 * A React component that renders a custom login form for a website.
 */
export type LoginViewComponent<T = unknown> = React.ComponentType<
  LoginViewProps<T>
>;
