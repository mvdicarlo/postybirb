export type E621AccountData = {
  username: string;
  key: string;
};

export type E621OAuthRoutes = {
  login: {
    request: E621AccountData;
    response: { result: boolean };
  };
};
