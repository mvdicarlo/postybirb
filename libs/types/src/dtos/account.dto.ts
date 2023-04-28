import { SubmissionType } from '@postybirb/types';

export interface ILoginState {
  isLoggedIn: boolean;
  username: string | null;
  pending: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface IAccountDto<T = any> {
  id: string;
  name: string;
  website: string;
  loginState: ILoginState;
  data: T;
  groups: string[];
  websiteInfo: IWebsiteInfo;
}

// TODO this somewhat is confusing in conjunction with the similarly named dto
export interface IWebsiteInfo {
  websiteDisplayName: string;
  supports: SubmissionType[];
}
