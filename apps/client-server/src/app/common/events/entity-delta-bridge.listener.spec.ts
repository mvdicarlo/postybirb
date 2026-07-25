import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { WSGateway } from '../../web-socket/web-socket-gateway';
import {
    EntityCreatedEvent,
    EntityRemovedEvent,
    EntityUpdatedEvent,
    getEntityCrudEventNames,
} from './entity-crud.events';
import { EntityDeltaBridge } from './entity-delta-bridge.listener';
import { ENTITY_DELTA_DESCRIPTORS } from './entity-delta.registry';

describe('EntityDeltaBridge', () => {
  let module: TestingModule;
  let eventEmitter: EventEmitter2;
  const emit = jest.fn();

  beforeEach(async () => {
    emit.mockReset();
    module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        {
          provide: EntityDeltaBridge,
          useFactory: (emitter: EventEmitter2, gateway: WSGateway) =>
            new EntityDeltaBridge(emitter, gateway),
          inject: [EventEmitter2, WSGateway],
        },
        { provide: WSGateway, useValue: { emit } },
      ],
    }).compile();
    await module.init();
    eventEmitter = module.get(EventEmitter2);
  });

  afterEach(async () => {
    await module.close();
  });

  it('registers at least one entity descriptor', () => {
    expect(ENTITY_DELTA_DESCRIPTORS.length).toBeGreaterThan(0);
  });

  it.each(ENTITY_DELTA_DESCRIPTORS)(
    'forwards $prefix created events as upserts to $delta',
    (descriptor) => {
      const names = getEntityCrudEventNames(descriptor.prefix);
      const dto = { id: 'created-id' };

      eventEmitter.emit(names.created, [new EntityCreatedEvent(dto)]);

      expect(emit).toHaveBeenCalledWith({
        event: descriptor.delta,
        data: { upserts: [dto], removedIds: [] },
      });
    },
  );

  it.each(ENTITY_DELTA_DESCRIPTORS)(
    'forwards $prefix updated events as upserts to $delta',
    (descriptor) => {
      const names = getEntityCrudEventNames(descriptor.prefix);
      const dto = { id: 'updated-id' };

      eventEmitter.emit(names.updated, [new EntityUpdatedEvent(dto)]);

      expect(emit).toHaveBeenCalledWith({
        event: descriptor.delta,
        data: { upserts: [dto], removedIds: [] },
      });
    },
  );

  it.each(ENTITY_DELTA_DESCRIPTORS)(
    'forwards $prefix removed events as removedIds to $delta',
    (descriptor) => {
      const names = getEntityCrudEventNames(descriptor.prefix);

      eventEmitter.emit(names.removed, [new EntityRemovedEvent('removed-id')]);

      expect(emit).toHaveBeenCalledWith({
        event: descriptor.delta,
        data: { upserts: [], removedIds: ['removed-id'] },
      });
    },
  );

  it('coalesces a batch of events into a single delta payload', () => {
    const descriptor = ENTITY_DELTA_DESCRIPTORS[0];
    const names = getEntityCrudEventNames(descriptor.prefix);

    eventEmitter.emit(names.created, [
      new EntityCreatedEvent({ id: 'a' }),
      new EntityCreatedEvent({ id: 'b' }),
    ]);

    expect(emit).toHaveBeenCalledWith({
      event: descriptor.delta,
      data: { upserts: [{ id: 'a' }, { id: 'b' }], removedIds: [] },
    });
  });

  it('stops forwarding once destroyed', () => {
    const localEmitter = new EventEmitter2();
    const localEmit = jest.fn();
    const bridge = new EntityDeltaBridge(localEmitter, {
      emit: localEmit,
    } as unknown as WSGateway);
    bridge.onModuleInit();

    const descriptor = ENTITY_DELTA_DESCRIPTORS[0];
    const names = getEntityCrudEventNames(descriptor.prefix);

    bridge.onModuleDestroy();
    localEmitter.emit(names.created, [new EntityCreatedEvent({ id: 'x' })]);

    expect(localEmit).not.toHaveBeenCalled();
  });
});
