export default interface UserAccount<T extends Record<string, unknown>> {
  id: string;
  website: string;
  name: string;
  data: T;
}
