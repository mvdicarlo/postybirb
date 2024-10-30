import { Constructor } from 'type-fest';
import { PostyBirbEntity } from '../../../database/entities/postybirb-entity';
import { OnDatabaseUpdateCallback } from '../../../database/subscribers/database.subscriber';

export interface OnDatabaseUpdate {
  getRegisteredEntities(): Constructor<PostyBirbEntity>[];
  onDatabaseUpdate: OnDatabaseUpdateCallback;
}

export function isOnDatabaseUpdate(
  // eslint-disable-next-line @typescript-eslint/ban-types
  thisService: Object,
): thisService is OnDatabaseUpdate {
  return 'getRegisteredEntities' in thisService;
}
