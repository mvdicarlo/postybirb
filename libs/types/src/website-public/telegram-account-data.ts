import { SelectOption } from '@postybirb/form-builder';

export interface TelegramAccountLoginData {
  appId: number;
  appHash: string;
  phoneNumber: string;
}

export interface TelegramAccountData extends TelegramAccountLoginData {
  session?: string;
  channels: SelectOption[];
}

export type TelegramOAuthRoutes = {
  startAuthentication: {
    request: TelegramAccountLoginData;
    response: undefined;
  };
  authenticate: {
    request: TelegramAccountLoginData & {
      password: string;
      code: string;
    };
    response: {
      success: boolean;
      message?: string;
      passwordRequired?: boolean;
      passwordInvalid?: boolean;
      codeInvalid?: boolean;
    };
  };
};
