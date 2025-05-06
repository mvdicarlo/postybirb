import { OAuthRouteHandlers, OAuthRoutes } from '@postybirb/types';

/**
 * Defines a method for allowing multi-stepped authorization flow for logging in a user.
 * Common to be used with custom login flow website.
 * @interface OAuthWebsite
 */
export interface OAuthWebsite<T extends OAuthRoutes> {
  /**
   * Methods that can be called using websiteApi.performOAuthStep
   */
  onAuthRoute: OAuthRouteHandlers<T>;
}
