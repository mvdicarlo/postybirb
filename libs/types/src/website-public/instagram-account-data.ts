export type InstagramApiType = 'instagram' | 'unified';

export type InstagramAccountData = {
  /** Meta/Facebook App ID */
  appId?: string;
  /** Meta/Facebook App Secret */
  appSecret?: string;
  /** Instagram access token supplied directly or obtained through OAuth */
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
   * Stores Meta App credentials (App ID / App Secret).
   */
  setAppCredentials: {
    request: { appId: string; appSecret: string };
    response: { success: boolean };
  };
  /**
   * Generates and returns the Facebook OAuth dialog URL.
   */
  getAuthUrl: {
    request: { redirectUri: string };
    response: {
      success: boolean;
      url?: string;
      state?: string;
      message?: string;
    };
  };
  /**
   * Retrieves the authorization code captured by the OAuth callback.
   * The UI polls this after opening the auth URL.
   */
  retrieveCode: {
    request: { state: string };
    response: {
      success: boolean;
      code?: string;
      message?: string;
    };
  };
  /**
   * Exchanges the authorization code for tokens, discovers the IG Business account.
   */
  exchangeCode: {
    request: { code: string; redirectUri: string };
    response: {
      success: boolean;
      igUsername?: string;
      igUserId?: string;
      tokenExpiry?: string;
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
