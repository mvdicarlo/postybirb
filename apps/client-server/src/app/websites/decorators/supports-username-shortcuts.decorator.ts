import { UsernameShortcut } from '@postybirb/types';
import { Class } from 'type-fest';
import { UnknownWebsite } from '../website';

/**
 * Sets a username shortcut for a website.
 * @param {UsernameShortcut} usernameShortcut
 */
export function SupportsUsernameShortcut(usernameShortcut: UsernameShortcut) {
  return function website(constructor: Class<UnknownWebsite>) {
    // eslint-disable-next-line no-param-reassign
    constructor.prototype.usernameShortcut = usernameShortcut;
  };
}
