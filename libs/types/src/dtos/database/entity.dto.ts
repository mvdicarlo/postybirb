import { IEntity } from '../../models';

export type IEntityDto<T extends IEntity = IEntity> = T;
