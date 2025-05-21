export type BlueskyAccountData = {
  username: string;
  password: string;
};

export type BlueskyOAuthRoutes = {
  login: {
    request: BlueskyAccountData;
    response: { result: boolean };
  };
};
