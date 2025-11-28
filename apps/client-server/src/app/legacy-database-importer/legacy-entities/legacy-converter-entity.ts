import { IEntity } from '@postybirb/types';

export type MinimalEntity<T extends IEntity> = Omit<
  T,
  'createdAt' | 'updatedAt'
>;

export interface LegacyConverterEntity<T extends IEntity> {
  convert(): MinimalEntity<T>;
}
