export default interface LoginRequestData<T extends Record<string, unknown>> {
  data: T;
  accountId: string;
}
