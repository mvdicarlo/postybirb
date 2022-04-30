export interface ILoginState {
  isLoggedIn: boolean;
  username: string | null;
  pending: boolean;
}

export interface IAccountDto<T = any> {
  id: string;
  name: string;
  website: string;
  loginState: ILoginState;
  data: T;
}
