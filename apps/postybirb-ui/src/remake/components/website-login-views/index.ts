/**
 * Registry of custom login view components for websites.
 * Maps website login component names to their React components.
 */

import { BlueskyLoginView } from './bluesky';
import { CustomLoginView } from './custom';
import { DiscordLoginView } from './discord';
import { E621LoginView } from './e621';
import { InkbunnyLoginView } from './inkbunny';
import { MegalodonLoginView } from './megalodon';
import { TelegramLoginView } from './telegram';
import { TwitterLoginView } from './twitter';
import type { LoginViewComponent } from './types';

// Re-export types and helpers
export {
  createLoginHttpErrorHandler,
  notifyInfo,
  notifyLoginError,
  notifyLoginFailed
} from './helpers';
export { LoginViewContainer } from './login-view-container';
export type { LoginViewComponent, LoginViewProps } from './types';

/**
 * Registry mapping loginComponentName to login view components.
 * The key must match the `loginComponentName` from the website's CustomLoginType.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loginViewRegistry: Record<string, LoginViewComponent<any>> = {
  Bluesky: BlueskyLoginView,
  Custom: CustomLoginView,
  Discord: DiscordLoginView,
  Friendica: MegalodonLoginView,
  GoToSocial: MegalodonLoginView,
  Inkbunny: InkbunnyLoginView,
  Mastodon: MegalodonLoginView,
  Pixelfed: MegalodonLoginView,
  Pleroma: MegalodonLoginView,
  Telegram: TelegramLoginView,
  Twitter: TwitterLoginView,
  e621: E621LoginView,
};

/**
 * Get the custom login view component for a website.
 * @param loginComponentName - The name from CustomLoginType.loginComponentName
 * @returns The login view component, or undefined if not found
 */
export function getLoginViewComponent(
  loginComponentName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): LoginViewComponent<any> | undefined {
  return loginViewRegistry[loginComponentName];
}

/**
 * Check if a custom login view exists for a website.
 * @param loginComponentName - The name from CustomLoginType.loginComponentName
 */
export function hasLoginViewComponent(loginComponentName: string): boolean {
  return loginComponentName in loginViewRegistry;
}
