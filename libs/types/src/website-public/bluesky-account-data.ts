export type BlueskyAccountData = {
  username: string;
  password: string;
  serviceUrl?: string; // Defaults to bsky.social
  appViewUrl?: string; // Defaults to bsky.app
};

export type BlueskyOAuthRoutes = {
  login: {
    request: BlueskyAccountData;
    response: { result: boolean };
  };
};
