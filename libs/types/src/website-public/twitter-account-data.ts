export type TwitterAccountData = {
  apiKey?: string; // Consumer key
  apiSecret?: string; // Consumer secret
  requestToken?: string; // Temporary oauth_token during authorization
  requestTokenSecret?: string; // Temporary oauth_token_secret during authorization
  accessToken?: string; // Final access token
  accessTokenSecret?: string; // Final access token secret
  screenName?: string; // User screen name
  userId?: string; // User id
};

export type TwitterOAuthRoutes = {
  /**
   * Sets API credentials (consumer key/secret) into website data store.
   */
  setApiKeys: {
    request: { apiKey: string; apiSecret: string };
    response: { success: boolean };
  };
  /**
   * Requests a request token from Twitter and returns the authorization URL.
   */
  requestToken: {
    request: Record<string, never>;
    response: {
      success: boolean;
      url?: string;
      oauthToken?: string;
      message?: string;
    };
  };
  /**
   * Completes OAuth with the provided oauth_verifier (PIN) and stores access tokens.
   */
  completeOAuth: {
    request: { verifier: string };
    response: {
      success: boolean;
      screenName?: string;
      userId?: string;
      message?: string;
    };
  };
};
