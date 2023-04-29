import { ISettings } from '../../models';

export type IUpdateSettingsDto = Pick<ISettings, 'id' | 'settings'>;
