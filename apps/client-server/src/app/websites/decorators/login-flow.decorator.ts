import { CustomLoginType, UserLoginType } from '@postybirb/dto';
import { Class } from 'type-fest';

export function UserLoginFlow(url: string) {
  return function website(constructor: Class) {
    const loginType: UserLoginType = {
      type: 'user',
      url,
    };

    // eslint-disable-next-line no-param-reassign
    constructor.prototype.loginType = loginType;
  };
}

export function CustomLoginFlow(loginComponentName: string) {
  return function website(constructor: Class) {
    const loginType: CustomLoginType = {
      type: 'custom',
      loginComponentName,
    };

    // eslint-disable-next-line no-param-reassign
    constructor.prototype.loginType = loginType;
  };
}
