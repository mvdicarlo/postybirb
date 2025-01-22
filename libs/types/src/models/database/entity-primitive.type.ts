import { IEntityDto } from '../../dtos';
import { IEntity } from './entity.interface';

export type EntityPrimitive<T extends IEntity | IEntityDto = IEntity> = Omit<
  T,
  'createdAt' | 'updatedAt'
> & {
  createdAt: string;
  updatedAt: string;
};
