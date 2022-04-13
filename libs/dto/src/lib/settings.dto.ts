export interface ISettingsOptions {
  hiddenWebsites: string[];
}

export interface ISettingsDto {
  id: string;
  profile: string;
  settings: ISettingsOptions;
}
