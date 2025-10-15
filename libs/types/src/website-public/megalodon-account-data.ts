export type MegalodonAccountData = {
  // Base URL of the instance (e.g., "mastodon.social", "pixelfed.social")
  instanceUrl: string;

  // OAuth client credentials (registered per-instance)
  clientId?: string;
  clientSecret?: string;

  // OAuth authorization code (temporary during login)
  authCode?: string;

  // Final access token after completing OAuth
  accessToken?: string;

  // Logged in username
  username?: string;

  // User's display name
  displayName?: string;

  // Instance type for polymorphic behavior if needed
  instanceType?: string;
};

export type MegalodonOAuthRoutes = {
  /**
   * Step 1: Register OAuth app with the instance
   */
  registerApp: {
    request: { instanceUrl: string };
    response: {
      success: boolean;
      authorizationUrl?: string;
      clientId?: string;
      clientSecret?: string;
      message?: string;
    };
  };

  /**
   * Step 2: Complete OAuth by exchanging code for token
   */
  completeOAuth: {
    request: { authCode: string };
    response: {
      success: boolean;
      username?: string;
      displayName?: string;
      message?: string;
    };
  };
};

// Specific website types can extend if needed
export type MastodonAccountData = MegalodonAccountData & {
  // Mastodon-specific fields if any
};

export type PleromaAccountData = MegalodonAccountData & {
  // Pleroma-specific fields if any
};

export type PixelfedAccountData = MegalodonAccountData & {
  // Pixelfed-specific fields if any
};
