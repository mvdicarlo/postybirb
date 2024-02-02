export type WebsiteLoginType = UserLoginType | CustomLoginType;

export type UserLoginType = {
  type: 'user';
  url: string;
};

export type CustomLoginType = {
  type: 'custom';
  loginComponentName: string;
};
