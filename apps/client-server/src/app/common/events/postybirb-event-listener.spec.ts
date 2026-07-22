import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { WSGateway } from '../../web-socket/web-socket-gateway';
import {
    EntityCreatedEvent,
    EntityRemovedEvent,
    EntityUpdatedEvent,
    getEntityCrudEventNames,
} from './entity-crud.events';
import { PostyBirbEventListener } from './postybirb-event-listener';

type TestDto = { id: string; value: string };

class TestEventListener extends PostyBirbEventListener<TestDto> {
  constructor(eventEmitter?: EventEmitter2, webSocket?: WSGateway) {
    super('test-entity', 'TEST_ENTITY_DELTA', eventEmitter, webSocket);
  }
}

describe('PostyBirbEventListener', () => {
  let module: TestingModule;
  let eventEmitter: EventEmitter2;
  const emit = jest.fn();
  const dto: TestDto = { id: 'test-id', value: 'value' };
  const eventNames = getEntityCrudEventNames('test-entity');

  beforeEach(async () => {
    emit.mockReset();
    module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        {
          provide: TestEventListener,
          useFactory: (emitter: EventEmitter2, gateway: WSGateway) =>
            new TestEventListener(emitter, gateway),
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

  it.each([
    [eventNames.created, new EntityCreatedEvent(dto)],
    [eventNames.updated, new EntityUpdatedEvent(dto)],
  ])('maps %s to an upsert delta', (topic, event) => {
    eventEmitter.emit(topic, event);

    expect(emit).toHaveBeenCalledWith({
      event: 'TEST_ENTITY_DELTA',
      data: { upserts: [dto], removedIds: [] },
    });
  });

  it('maps removals to a removal delta', () => {
    eventEmitter.emit(eventNames.removed, new EntityRemovedEvent(dto.id));

    expect(emit).toHaveBeenCalledWith({
      event: 'TEST_ENTITY_DELTA',
      data: { upserts: [], removedIds: [dto.id] },
    });
  });

  it('contains websocket transport errors', () => {
    emit.mockImplementationOnce(() => {
      throw new Error('socket unavailable');
    });

    expect(() =>
      eventEmitter.emit(eventNames.created, new EntityCreatedEvent(dto)),
    ).not.toThrow();
  });

  it('does not register duplicate listeners', () => {
    module.get(TestEventListener).onModuleInit();
    eventEmitter.emit(eventNames.created, new EntityCreatedEvent(dto));

    expect(emit).toHaveBeenCalledTimes(1);
  });

  it('removes listeners when destroyed', () => {
    module.get(TestEventListener).onModuleDestroy();
    eventEmitter.emit(eventNames.created, new EntityCreatedEvent(dto));

    expect(emit).not.toHaveBeenCalled();
  });

  it('supports missing event and websocket infrastructure', () => {
    const listener = new TestEventListener();

    expect(() => {
      listener.onModuleInit();
      listener.onModuleDestroy();
    }).not.toThrow();
  });
});
