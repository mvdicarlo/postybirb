import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { TAG_CONVERTER_DELTA } from '@postybirb/socket-events';
import { TagConverterDto } from '@postybirb/types';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { TagConverterEventListener } from './tag-converter-event.listener';
import {
  TAG_CONVERTER_CREATED,
  TAG_CONVERTER_REMOVED,
  TAG_CONVERTER_UPDATED,
  TagConverterCreatedEvent,
  TagConverterRemovedEvent,
  TagConverterUpdatedEvent,
} from './tag-converter.events';

describe('TagConverterEventListener', () => {
  let module: TestingModule;
  let eventEmitter: EventEmitter2;
  const emit = jest.fn();
  const dto: TagConverterDto = {
    id: 'tag-converter-id',
    tag: 'tag',
    convertTo: { default: 'converted' },
    createdAt: '2026-07-22T00:00:00.000Z',
    updatedAt: '2026-07-22T00:00:00.000Z',
  };

  beforeEach(async () => {
    emit.mockClear();
    module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        TagConverterEventListener,
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
    [TAG_CONVERTER_CREATED, new TagConverterCreatedEvent(dto)],
    [TAG_CONVERTER_UPDATED, new TagConverterUpdatedEvent(dto)],
  ])('maps %s to an upsert delta', (topic, event) => {
    eventEmitter.emit(topic, event);

    expect(emit).toHaveBeenCalledWith({
      event: TAG_CONVERTER_DELTA,
      data: { upserts: [dto], removedIds: [] },
    });
  });

  it('maps removals to a removal delta', () => {
    eventEmitter.emit(
      TAG_CONVERTER_REMOVED,
      new TagConverterRemovedEvent(dto.id),
    );

    expect(emit).toHaveBeenCalledWith({
      event: TAG_CONVERTER_DELTA,
      data: { upserts: [], removedIds: [dto.id] },
    });
  });

  it('contains websocket transport errors', () => {
    emit.mockImplementationOnce(() => {
      throw new Error('socket unavailable');
    });

    expect(() =>
      eventEmitter.emit(
        TAG_CONVERTER_CREATED,
        new TagConverterCreatedEvent(dto),
      ),
    ).not.toThrow();
  });
});