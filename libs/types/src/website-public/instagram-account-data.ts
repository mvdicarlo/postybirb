export type InstagramApiType = 'instagram' | 'unified';

export type InstagramAccountData = {
  /** Instagram access token supplied directly by the user */
  accessToken?: string;
  /** API setup for this token; older accounts default to Instagram Login */
  apiType?: InstagramApiType;
  /** ISO string of when the access token expires, when known */
  tokenExpiry?: string;
  /** Instagram-scoped user ID */
  igUserId?: string;
  /** Instagram username */
  igUsername?: string;
};

export type InstagramOAuthRoutes = {
  /**
   * Validates and stores a bearer token and discovers its Instagram account.
   */
  setAccessToken: {
    request: { accessToken: string };
    response: {
      success: boolean;
      igUsername?: string;
      igUserId?: string;
      apiType?: InstagramApiType;
      message?: string;
    };
  };
  /**
   * Refreshes the long-lived token before it expires.
   */
  refreshToken: {
    request: Record<string, never>;
    response: {
      success: boolean;
      tokenExpiry?: string;
      message?: string;
    };
  };
};
