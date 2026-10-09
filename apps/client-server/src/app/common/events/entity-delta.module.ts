import { Module } from '@nestjs/common';
import { EntityDeltaBridge } from './entity-delta-bridge.listener';

/**
 * Registers the single {@link EntityDeltaBridge} that forwards all standard
 * entity CRUD events to the websocket. Imported once by the root module.
 */
@Module({
  providers: [EntityDeltaBridge],
})
export class EntityDeltaModule {}
