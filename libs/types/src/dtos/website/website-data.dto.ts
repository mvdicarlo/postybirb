import { IWebsiteData, DynamicObject } from '../../models';
import { IEntityDto } from '../database/entity.dto';

export type IWebsiteDataDto<T extends DynamicObject> = IEntityDto<
  IWebsiteData<T>
>;
