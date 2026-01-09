export type WebsiteLoginType = UserLoginType | CustomLoginType;

interface BaseLoginType {
  type: string;
}

export interface UserLoginType extends BaseLoginType {
  type: 'user';
  url: string;
}

export interface CustomLoginType extends BaseLoginType {
  type: 'custom';
  loginComponentName: string;
}
