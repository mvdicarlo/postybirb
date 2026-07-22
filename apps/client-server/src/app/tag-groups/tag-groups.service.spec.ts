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
import { CreateTagGroupDto } from './dtos/create-tag-group.dto';
import { TAG_GROUP_EVENT_PREFIX } from './tag-group.events';
import { TagGroupsService } from './tag-groups.service';

describe('TagGroupsService', () => {
  let service: TagGroupsService;
  let module: TestingModule;
  const emit = jest.fn();
  const eventNames = getEntityCrudEventNames(TAG_GROUP_EVENT_PREFIX);

  function createTagGroupDto(name: string, tags: string[]) {
    const dto = new CreateTagGroupDto();
    dto.name = name;
    dto.tags = tags;
    return dto;
  }

  beforeEach(async () => {
    clearDatabase();
    emit.mockClear();
    module = await Test.createTestingModule({
      providers: [
        TagGroupsService,
        { provide: EventEmitter2, useValue: { emit } },
      ],
    }).compile();

    service = module.get<TagGroupsService>(TagGroupsService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create entities', async () => {
    const dto = createTagGroupDto('test', ['test', 'tag group']);

    const record = await service.create(dto);
    const groups = await service.findAll();
    expect(groups).toHaveLength(1);
    expect(groups[0].name).toEqual(dto.name);
    expect(groups[0].tags).toEqual(dto.tags);
    expect(record.toDTO()).toEqual({
      name: dto.name,
      tags: dto.tags,
      id: record.id,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
    expect(emit).toHaveBeenCalledWith(
      eventNames.created,
      new EntityCreatedEvent(record.toDTO()),
    );
  });

  it('should fail to create duplicate named groups', async () => {
    const dto = createTagGroupDto('test', ['test']);
    const dto2 = createTagGroupDto('test', ['test', 'test-dupe']);

    await service.create(dto);
    emit.mockClear();
    const groups = await service.findAll();
    expect(groups).toHaveLength(1);
    expect(groups[0].name).toEqual(dto.name);
    expect(groups[0].tags).toEqual(dto.tags);

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
    const dto = createTagGroupDto('test', ['test', 'tag group']);

    const record = await service.create(dto);
    const groups = await service.findAll();
    expect(groups).toHaveLength(1);

    const updateDto = new CreateTagGroupDto();
    updateDto.name = 'test';
    updateDto.tags = ['test', 'updated'];
    const updated = await service.update(record.id, updateDto);
    const updatedRec = await service.findByIdOrThrow(record.id);
    expect(updatedRec.name).toBe(updateDto.name);
    expect(updatedRec.tags).toEqual(updateDto.tags);
    expect(emit).toHaveBeenLastCalledWith(
      eventNames.updated,
      new EntityUpdatedEvent(updated.toDTO()),
    );
  });

  it('should not emit when updating a missing entity', async () => {
    const updateDto = createTagGroupDto('missing', []);

    await expect(service.update('missing', updateDto)).rejects.toThrow();
    expect(emit).not.toHaveBeenCalled();
  });

  it('should delete entities', async () => {
    const dto = createTagGroupDto('test', ['test', 'tag group']);

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
});
