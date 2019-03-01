export interface LoginProfile {
  id: string;
  name: string;
  defaultProfile: boolean;
  data?: any; // Any additional data we might want to attach to the instance
}
