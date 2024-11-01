/**
 * Defines a method for allowing multi-stepped authorization flow for logging in a user.
 * Common to be used with CustomLoginWebsite.
 * @interface OAuthWebsite
 */
export interface OAuthWebsite {
  onAuthorize(
    data: Record<string, unknown>,
    state: string,
  ): Promise<Record<string, unknown>>;
}
