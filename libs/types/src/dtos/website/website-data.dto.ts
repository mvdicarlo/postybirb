import { DynamicObject, IWebsiteData } from '../../models';
import { IEntityDto } from '../database/entity.dto';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IWebsiteDataDto<T extends DynamicObject = any> = IEntityDto<
  IWebsiteData<T>
>;
