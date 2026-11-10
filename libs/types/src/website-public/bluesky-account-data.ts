import { SelectOption } from "@postybirb/form-builder";

export type BlueskyAccountData = {
  username: string;
  password: string;
  serviceUrl?: string; // Defaults to bsky.social
  appViewUrl?: string; // Defaults to bsky.app

  whoCanReplyConfigurable?: SelectOption[]
};

export type BlueskyOAuthRoutes = {
  login: {
    request: BlueskyAccountData;
    response: { result: boolean };
  };
};
