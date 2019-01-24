export enum LoginStatus {
  LOGGED_IN = 1,
  LOGGED_OUT = 0
}

export interface WebsiteStatus {
  username: string,
  status: LoginStatus
}

export interface WebsiteService {
  checkStatus(profileId: string): Promise<WebsiteStatus>;
}
