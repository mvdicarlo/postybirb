import { BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import {
  EntityCreatedEvent,
  EntityRemovedEvent,
  EntityUpdatedEvent,
  getEntityCrudEventNames,
} from '../common/events/entity-crud.events';
import { CreateUserConverterDto } from './dtos/create-user-converter.dto';
import { UpdateUserConverterDto } from './dtos/update-user-converter.dto';
import { USER_CONVERTER_EVENT_PREFIX } from './user-converter.events';
import { UserConvertersService } from './user-converters.service';

describe('UserConvertersService', () => {
  let service: UserConvertersService;
  let module: TestingModule;
  const emit = jest.fn();
  const eventNames = getEntityCrudEventNames(USER_CONVERTER_EVENT_PREFIX);

  function createUserConverterDto(
    username: string,
    convertTo: Record<string, string>,
  ) {
    const dto = new CreateUserConverterDto();
    dto.username = username;
    dto.convertTo = convertTo;
    return dto;
  }

  beforeEach(async () => {
    clearDatabase();
    emit.mockClear();
    module = await Test.createTestingModule({
      providers: [
        UserConvertersService,
        { provide: EventEmitter2, useValue: { emit } },
      ],
    }).compile();

    service = module.get<UserConvertersService>(UserConvertersService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create entities', async () => {
    const dto = createUserConverterDto('my_friend', {
      default: 'converted_friend',
    });

    const record = await service.create(dto);
    const converters = await service.findAll();
    expect(converters).toHaveLength(1);
    expect(converters[0].username).toEqual(dto.username);
    expect(converters[0].convertTo).toEqual(dto.convertTo);
    expect(record.toObject()).toEqual({
      username: dto.username,
      convertTo: dto.convertTo,
      id: record.id,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
    expect(emit).toHaveBeenCalledWith(
      eventNames.created,
      new EntityCreatedEvent(record.toDTO()),
    );
  });

  it('should fail to create duplicate user converters', async () => {
    const dto = createUserConverterDto('my_friend', {
      default: 'converted_friend',
    });
    const dto2 = createUserConverterDto('my_friend', {
      default: 'converted_friend2',
    });

    await service.create(dto);
    emit.mockClear();

    let expectedException = null;
    try {
      await service.create(dto2);
    } catch (err) {
      expectedException = err;
    }
    expect(expectedException).toBeInstanceOf(BadRequestException);
    expect(emit).not.toHaveBeenCalled();
  });

  it('should update entities', async () => {
    const dto = createUserConverterDto('my_friend', {
      default: 'converted_friend',
    });

    const record = await service.create(dto);
    const converters = await service.findAll();
    expect(converters).toHaveLength(1);

    const updateDto = new UpdateUserConverterDto();
    updateDto.username = 'my_friend';
    updateDto.convertTo = {
      default: 'converted_friend',
      bluesky: 'converted_friend2',
    };
    const updated = await service.update(record.id, updateDto);
    const updatedRec = await service.findByIdOrThrow(record.id);
    expect(updatedRec.username).toBe(updateDto.username);
    expect(updatedRec.convertTo).toEqual(updateDto.convertTo);
    expect(emit).toHaveBeenLastCalledWith(
      eventNames.updated,
      new EntityUpdatedEvent(updated.toDTO()),
    );
  });

  it('should not emit when updating a missing entity', async () => {
    const updateDto = new UpdateUserConverterDto();
    updateDto.username = 'missing';
    updateDto.convertTo = {};

    await expect(service.update('missing', updateDto)).rejects.toThrow();
    expect(emit).not.toHaveBeenCalled();
  });

  it('should delete entities', async () => {
    const dto = createUserConverterDto('my_friend', {
      default: 'converted_friend',
    });

    const record = await service.create(dto);
    expect(await service.findAll()).toHaveLength(1);

    await service.remove(record.id);
    expect(await service.findAll()).toHaveLength(0);
    expect(emit).toHaveBeenLastCalledWith(
      eventNames.removed,
      new EntityRemovedEvent(record.id),
    );
  });

  it('should not emit when removing a missing entity', async () => {
    await service.remove('missing');
    expect(emit).not.toHaveBeenCalled();
  });

  it('should convert usernames', async () => {
    const dto = createUserConverterDto('my_friend', {
      default: 'default_friend',
      bluesky: 'friend.bsky.social',
    });

    await service.create(dto);

    // Test conversion for bluesky
    const resultBluesky = await service.convert(
      { decoratedProps: { metadata: { name: 'bluesky' } } } as any,
      'my_friend',
    );
    expect(resultBluesky).toEqual('friend.bsky.social');

    // Test conversion for unknown website (should use default)
    const resultDefault = await service.convert(
      { decoratedProps: { metadata: { name: 'unknown' } } } as any,
      'my_friend',
    );
    expect(resultDefault).toEqual('default_friend');

    // Test conversion for username not in converter (should return original)
    const resultNotFound = await service.convert(
      { decoratedProps: { metadata: { name: 'bluesky' } } } as any,
      'unknown_user',
    );
    expect(resultNotFound).toEqual('unknown_user');
  });
});
