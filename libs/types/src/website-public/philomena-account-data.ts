export type PhilomenaAccountData = {
  username?: string;
  key?: string;
};

export type PhilomenaOAuthRoutes = {
  login: {
    request: {
      username: string;
      key: string;
    };
    response: { result: boolean };
  };
};
