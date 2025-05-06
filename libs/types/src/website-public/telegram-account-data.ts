import { SelectOptionItem } from '@postybirb/form-builder';

export interface TelegramAccountData extends TelegramAccountDataPublic {
  session?: string;
  channels: SelectOptionItem[];
}

export interface TelegramAccountDataPublic {
  appId: number;
  appHash: string;
  phoneNumber: string;
}

export type TelegramCustomRoutes = {
  startAuthentication: {
    request: TelegramAccountDataPublic;
    response: undefined;
  };
  authenticate: {
    request: TelegramAccountDataPublic & {
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
