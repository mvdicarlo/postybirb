import { ISettingsOptions } from './settings.dto';

export interface IUpdateSettingsDto {
  id: string;
  settings: ISettingsOptions;
}
