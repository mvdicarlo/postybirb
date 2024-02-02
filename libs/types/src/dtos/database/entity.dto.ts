import { IEntity } from '../../models';

export type OmittedEntityFields = 'createdAt' | 'updatedAt' | 'toJson';

export type IEntityDto<T extends IEntity = IEntity> = Omit<
  T,
  OmittedEntityFields
> &
  Pick<IEntity, 'id'> & {
    /**
     * Created timestamp as string.
     *
     * @type {string}
     */
    createdAt: string;
    /**
     * Last updated timestamp as string.
     *
     * @type {string}
     */
    updatedAt: string;
  };
