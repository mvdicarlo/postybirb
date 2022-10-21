import { Constructor } from 'type-fest';
import { BaseEntity } from '../../../database/entities/base.entity';
import { OnDatabaseUpdateCallback } from '../../../database/subscribers/database.subscriber';

export interface OnDatabaseUpdate {
  getRegisteredEntities(): Constructor<BaseEntity>[];
  onDatabaseUpdate: OnDatabaseUpdateCallback;
}

export function isOnDatabaseUpdate(
  // eslint-disable-next-line @typescript-eslint/ban-types
  thisService: Object
): thisService is OnDatabaseUpdate {
  return 'getRegisteredEntities' in thisService;
}
