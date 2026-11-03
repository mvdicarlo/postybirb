import { SelectOption } from '@postybirb/form-builder';

export type Adore34AccountData = {
  apiKey: string;
  tiers?: SelectOption[];
};

export type Adore34OAuthRoutes = {
  login: {
    request: { apiKey: string };
    response: { result: boolean };
  };
};
