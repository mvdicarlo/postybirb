export type YiffPartyAccountData = {
  apiKey?: string;
  artistName?: string;
  tagSlug?: string;
  minTags?: number;
};

export type YiffPartyOAuthRoutes = {
  login: {
    request: { apiKey: string };
    response: { result: boolean };
  };
};
