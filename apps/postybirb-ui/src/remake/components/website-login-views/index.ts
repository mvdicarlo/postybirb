/**
 * Registry of custom login view components for websites.
 * Maps website login component names to their React components.
 */

import { InkbunnyLoginView } from './inkbunny';
import type { LoginViewComponent } from './types';

// Re-export types and helpers
export {
    notifyLoginError,
    notifyLoginFailed,
    notifyLoginSuccess
} from './helpers';
export type { LoginViewComponent, LoginViewProps } from './types';

/**
 * Registry mapping loginComponentName to login view components.
 * The key must match the `loginComponentName` from the website's CustomLoginType.
 */
const loginViewRegistry: Record<string, LoginViewComponent> = {
  Inkbunny: InkbunnyLoginView,
  // Add more as they are implemented:
  // Bluesky: BlueskyLoginView,
  // Discord: DiscordLoginView,
  // e621: E621LoginView,
  // etc.
};

/**
 * Get the custom login view component for a website.
 * @param loginComponentName - The name from CustomLoginType.loginComponentName
 * @returns The login view component, or undefined if not found
 */
export function getLoginViewComponent(
  loginComponentName: string,
): LoginViewComponent | undefined {
  return loginViewRegistry[loginComponentName];
}

/**
 * Check if a custom login view exists for a website.
 * @param loginComponentName - The name from CustomLoginType.loginComponentName
 */
export function hasLoginViewComponent(loginComponentName: string): boolean {
  return loginComponentName in loginViewRegistry;
}
