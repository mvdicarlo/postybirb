import { SelectOption } from '@postybirb/form-builder';

export type SofurryAccountData = {
  /**
   * Personal Access Token (PAT) used to authenticate against the SoFurry
   * public API. Generated at https://www.sofurry.com/settings/pat-create.
   */
  token?: string;
  folders?: SelectOption[];
};

export type SofurryOAuthRoutes = {
  login: {
    request: { token: string };
    response: { result: boolean };
  };
};
