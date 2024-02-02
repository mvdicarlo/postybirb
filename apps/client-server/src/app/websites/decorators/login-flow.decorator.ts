import { CustomLoginType, UserLoginType } from '@postybirb/types';
import { Class } from 'type-fest';
import { UnknownWebsite } from '../website';

/**
 * Identifies the website as having a user login flow.
 * Meaning that they will login to the website using the website url provided.
 * @param {string} url
 */
export function UserLoginFlow(url: string) {
  return function website(constructor: Class<UnknownWebsite>) {
    const loginType: UserLoginType = {
      type: 'user',
      url,
    };

    // eslint-disable-next-line no-param-reassign
    constructor.prototype.loginType = loginType;
  };
}

/**
 * Idenfifies the website as  having a custom login flow.
 * Meaning that they will login through a custom provided form / component.
 * Defaults the name of the class if no name is provided.
 * @param {string} [loginComponentName]
 */
export function CustomLoginFlow(loginComponentName?: string) {
  return function website(constructor: Class<UnknownWebsite>) {
    const loginType: CustomLoginType = {
      type: 'custom',
      loginComponentName: loginComponentName ?? constructor.name,
    };

    // eslint-disable-next-line no-param-reassign
    constructor.prototype.loginType = loginType;
  };
}
