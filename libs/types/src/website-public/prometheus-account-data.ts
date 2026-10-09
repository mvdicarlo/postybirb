import { SelectOption } from '@postybirb/form-builder';

export type PrometheusAccountData = {
  username?: string;
  apiKey?: string;
  folders?: SelectOption[];
  pools?: SelectOption[];
};

export type PrometheusOAuthRoutes = {
  login: {
    request: { username: string; apiKey: string };
    response: { result: boolean };
  };
};
