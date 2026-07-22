import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { USER_CONVERTER_DELTA } from '@postybirb/socket-events';
import { UserConverterDto } from '@postybirb/types';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { UserConverterEventListener } from './user-converter-event.listener';
import {
    USER_CONVERTER_CREATED,
    USER_CONVERTER_REMOVED,
    USER_CONVERTER_UPDATED,
    UserConverterCreatedEvent,
    UserConverterRemovedEvent,
    UserConverterUpdatedEvent,
} from './user-converter.events';

describe('UserConverterEventListener', () => {
  let module: TestingModule;
  let eventEmitter: EventEmitter2;
  const emit = jest.fn();
  const dto: UserConverterDto = {
    id: 'user-converter-id',
    username: 'username',
    convertTo: { default: 'converted' },
    createdAt: '2026-07-22T00:00:00.000Z',
    updatedAt: '2026-07-22T00:00:00.000Z',
  };

  beforeEach(async () => {
    emit.mockClear();
    module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        UserConverterEventListener,
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
    [USER_CONVERTER_CREATED, new UserConverterCreatedEvent(dto)],
    [USER_CONVERTER_UPDATED, new UserConverterUpdatedEvent(dto)],
  ])('maps %s to an upsert delta', (topic, event) => {
    eventEmitter.emit(topic, event);

    expect(emit).toHaveBeenCalledWith({
      event: USER_CONVERTER_DELTA,
      data: { upserts: [dto], removedIds: [] },
    });
  });

  it('maps removals to a removal delta', () => {
    eventEmitter.emit(
      USER_CONVERTER_REMOVED,
      new UserConverterRemovedEvent(dto.id),
    );

    expect(emit).toHaveBeenCalledWith({
      event: USER_CONVERTER_DELTA,
      data: { upserts: [], removedIds: [dto.id] },
    });
  });

  it('contains websocket transport errors', () => {
    emit.mockImplementationOnce(() => {
      throw new Error('socket unavailable');
    });

    expect(() =>
      eventEmitter.emit(
        USER_CONVERTER_CREATED,
        new UserConverterCreatedEvent(dto),
      ),
    ).not.toThrow();
  });
});