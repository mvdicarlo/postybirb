import { IWebsiteData, SafeObject } from '../../models';
import { IEntityDto } from '../database/entity.dto';

export type IWebsiteDataDto<T extends SafeObject> = IEntityDto<IWebsiteData<T>>;
