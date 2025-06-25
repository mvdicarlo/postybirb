export type UpdateCookiesRemote = {
  /**
   * The account ID for which cookies are being updated.
   */
  accountId: string;

  /**
   * The cookies to be set for the account as base64.
   */
  cookies: string;
};
