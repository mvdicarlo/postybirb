import { UsernameShortcut } from '@postybirb/dto';
import { Class } from 'type-fest';

/**
 * Sets a username shortcut for a website.
 * @param {UsernameShortcut} usernameShortcut
 */
export function SupportsUsernameShortcut(usernameShortcut: UsernameShortcut) {
  return function website(constructor: Class) {
    // eslint-disable-next-line no-param-reassign
    constructor.prototype.usernameShortcut = usernameShortcut;
  };
}
