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
}
