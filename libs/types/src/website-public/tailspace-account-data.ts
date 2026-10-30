import { SelectOption } from '@postybirb/form-builder';

export type TailspaceAccountData = {
  apiKey?: string;
  username?: string;
  comics?: SelectOption[];
};

export type TailspaceOAuthRoutes = {
  login: {
    request: { apiKey: string };
    response: { result: boolean };
  };
};
