export type UpdateCookiesRemote = {
  /**
   * The account ID for which cookies are being updated.
   */
  accountId: string;

  /**
   * The cookies to be set for the account as base64.
   */
  cookies: string;

  /**
   * The local storages to be set for the account
   */
  localStorage?: {
    /** Url to set the localStorage to */
    url: string;

    /** The actual local storage data */
    data: Record<string, unknown>;
  };
};
