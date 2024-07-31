import { CustomLoginType, UserLoginType } from '@postybirb/types';
import { Class } from 'type-fest';
import { UnknownWebsite } from '../website';
import { injectWebsiteDecoratorProps } from './website-decorator-props';

/**
 * Identifies the website as having a user login flow.
 * Meaning that they will login to the website using the website url provided.
 * @param {string} url
 */
export function UserLoginFlow(url: string) {
  return function website(constructor: Class<UnknownWebsite>) {
    const loginFlow: UserLoginType = {
      type: 'user',
      url,
    };

    injectWebsiteDecoratorProps(constructor, { loginFlow });
  };
}

/**
 * Identifies the website as having a custom login flow.
 * Meaning that they will login through a custom provided form / component.
 * Defaults the name of the class if no name is provided.
 * @param {string} loginComponentName
 */
export function CustomLoginFlow(loginComponentName?: string) {
  return function website(constructor: Class<UnknownWebsite>) {
    const loginFlow: CustomLoginType = {
      type: 'custom',
      loginComponentName: loginComponentName ?? constructor.name,
    };

    injectWebsiteDecoratorProps(constructor, { loginFlow });
  };
}
