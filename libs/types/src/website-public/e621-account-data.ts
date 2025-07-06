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

// Source: https://e621.net/tags
export enum E621TagCategory {
  General = 0,
  Artist = 1,
  Contributor = 2,
  Copyright = 3,
  Character = 4,
  Species = 5,
  Invalid = 6,
  Meta = 7,
  Lore = 8,
}
