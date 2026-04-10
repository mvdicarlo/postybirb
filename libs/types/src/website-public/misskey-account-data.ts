export type MisskeyAccountData = {
  /** Base URL of the instance (e.g., "misskey.io", "sharkey.example.com") */
  instanceUrl: string;

  /** MiAuth session ID (temporary, used during auth flow) */
  miAuthSessionId?: string;

  /** Access token obtained via MiAuth */
  accessToken?: string;

  /** Logged-in username */
  username?: string;
};

export type MisskeyOAuthRoutes = {
  /**
   * Step 1: Generate MiAuth URL for the user to authorize
   */
  generateAuthUrl: {
    request: { instanceUrl: string };
    response: {
      success: boolean;
      authUrl?: string;
      sessionId?: string;
      message?: string;
    };
  };

  /**
   * Step 2: Check MiAuth session and exchange for token
   */
  completeAuth: {
    request: Record<string, never>;
    response: {
      success: boolean;
      username?: string;
      message?: string;
    };
  };
};
