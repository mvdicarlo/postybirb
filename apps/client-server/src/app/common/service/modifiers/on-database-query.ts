import { FindOptions } from '@mikro-orm/core';
import { BaseEntity } from '../../../database/entities/base.entity';

export interface OnDatabaseQuery<T extends BaseEntity> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getDefaultQueryOptions(): FindOptions<T, any>;
}

export function isOnDatabaseQuery(
  // eslint-disable-next-line @typescript-eslint/ban-types
  thisService: Object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): thisService is OnDatabaseQuery<any> {
  return 'getDefaultQueryOptions' in thisService;
}
