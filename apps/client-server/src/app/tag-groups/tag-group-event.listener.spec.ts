import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { TAG_GROUP_DELTA } from '@postybirb/socket-events';
import { TagGroupDto } from '@postybirb/types';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { TagGroupEventListener } from './tag-group-event.listener';
import {
    TAG_GROUP_CREATED,
    TAG_GROUP_REMOVED,
    TAG_GROUP_UPDATED,
    TagGroupCreatedEvent,
    TagGroupRemovedEvent,
    TagGroupUpdatedEvent,
} from './tag-group.events';

describe('TagGroupEventListener', () => {
  let module: TestingModule;
  let eventEmitter: EventEmitter2;
  const emit = jest.fn();
  const dto: TagGroupDto = {
    id: 'tag-group-id',
    name: 'Group',
    tags: ['tag'],
    createdAt: '2026-07-22T00:00:00.000Z',
    updatedAt: '2026-07-22T00:00:00.000Z',
  };

  beforeEach(async () => {
    emit.mockClear();
    module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        TagGroupEventListener,
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
    [TAG_GROUP_CREATED, new TagGroupCreatedEvent(dto)],
    [TAG_GROUP_UPDATED, new TagGroupUpdatedEvent(dto)],
  ])('maps %s to an upsert delta', (topic, event) => {
    eventEmitter.emit(topic, event);

    expect(emit).toHaveBeenCalledWith({
      event: TAG_GROUP_DELTA,
      data: { upserts: [dto], removedIds: [] },
    });
  });

  it('maps removals to a removal delta', () => {
    eventEmitter.emit(
      TAG_GROUP_REMOVED,
      new TagGroupRemovedEvent(dto.id),
    );

    expect(emit).toHaveBeenCalledWith({
      event: TAG_GROUP_DELTA,
      data: { upserts: [], removedIds: [dto.id] },
    });
  });

  it('contains websocket transport errors', () => {
    emit.mockImplementationOnce(() => {
      throw new Error('socket unavailable');
    });

    expect(() =>
      eventEmitter.emit(
        TAG_GROUP_CREATED,
        new TagGroupCreatedEvent(dto),
      ),
    ).not.toThrow();
  });
});