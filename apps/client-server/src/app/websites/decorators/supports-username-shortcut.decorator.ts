import { UsernameShortcut } from '@postybirb/types';
import { Class } from 'type-fest';
import { UnknownWebsite } from '../website';
import { injectWebsiteDecoratorProps } from './website-decorator-props';

/**
 * Sets a username shortcut for a website.
 * @param {UsernameShortcut} usernameShortcut
 */
export function SupportsUsernameShortcut(usernameShortcut: UsernameShortcut) {
  return function website(constructor: Class<UnknownWebsite>) {
    injectWebsiteDecoratorProps(constructor, { usernameShortcut });
  };
}
