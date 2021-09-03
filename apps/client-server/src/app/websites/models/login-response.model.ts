export default interface LoginResponse<T extends Record<string, unknown>> {
  data: T;
  loginData: LoginData;
}

interface LoginData {
  username: string;
  loggedIn: boolean;
}
