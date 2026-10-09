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
import { CreateTagConverterDto } from './dtos/create-tag-converter.dto';
import { UpdateTagConverterDto } from './dtos/update-tag-converter.dto';
import { TAG_CONVERTER_EVENT_PREFIX } from './tag-converter.events';
import { TagConvertersService } from './tag-converters.service';

describe('TagConvertersService', () => {
  let service: TagConvertersService;
  let module: TestingModule;
  const emit = jest.fn();
  const eventNames = getEntityCrudEventNames(TAG_CONVERTER_EVENT_PREFIX);

  function createTagConverterDto(
    tag: string,
    convertTo: Record<string, string>,
  ) {
    const dto = new CreateTagConverterDto();
    dto.tag = tag;
    dto.convertTo = convertTo;
    return dto;
  }

  beforeEach(async () => {
    clearDatabase();
    emit.mockClear();
    module = await Test.createTestingModule({
      providers: [
        TagConvertersService,
        { provide: EventEmitter2, useValue: { emit } },
      ],
    }).compile();

    service = module.get<TagConvertersService>(TagConvertersService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create entities', async () => {
    const dto = createTagConverterDto('test', { default: 'converted' });

    const record = await service.create(dto);
    const groups = await service.findAll();
    expect(groups).toHaveLength(1);
    expect(groups[0].tag).toEqual(dto.tag);
    expect(groups[0].convertTo).toEqual(dto.convertTo);
    expect(record.toObject()).toEqual({
      tag: dto.tag,
      convertTo: dto.convertTo,
      id: record.id,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
    expect(emit).toHaveBeenCalledWith(
      eventNames.created,
      [new EntityCreatedEvent(record.toDTO())],
    );
  });

  it('should fail to create duplicate tag converters', async () => {
    const dto = createTagConverterDto('test', { default: 'converted' });
    const dto2 = createTagConverterDto('test', { default: 'converted' });

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
    const dto = createTagConverterDto('test', { default: 'converted' });

    const record = await service.create(dto);
    const groups = await service.findAll();
    expect(groups).toHaveLength(1);

    const updateDto = new UpdateTagConverterDto();
    updateDto.tag = 'test';
    updateDto.convertTo = { default: 'converted', test: 'converted2' };
    const updated = await service.update(record.id, updateDto);
    const updatedRec = await service.findByIdOrThrow(record.id);
    expect(updatedRec.tag).toBe(updateDto.tag);
    expect(updatedRec.convertTo).toEqual(updateDto.convertTo);
    expect(emit).toHaveBeenLastCalledWith(
      eventNames.updated,
      [new EntityUpdatedEvent(updated.toDTO())],
    );
  });

  it('should not emit when updating a missing entity', async () => {
    const updateDto = new UpdateTagConverterDto();
    updateDto.tag = 'missing';
    updateDto.convertTo = {};

    await expect(service.update('missing', updateDto)).rejects.toThrow();
    expect(emit).not.toHaveBeenCalled();
  });

  it('should delete entities', async () => {
    const dto = createTagConverterDto('test', { default: 'converted' });

    const record = await service.create(dto);
    expect(await service.findAll()).toHaveLength(1);

    await service.remove(record.id);
    expect(await service.findAll()).toHaveLength(0);
    expect(emit).toHaveBeenLastCalledWith(
      eventNames.removed,
      [new EntityRemovedEvent(record.id)],
    );
  });

  it('should not emit when removing a missing entity', async () => {
    await service.remove('missing');
    expect(emit).not.toHaveBeenCalled();
  });

  it('should convert tags', async () => {
    const dto = createTagConverterDto('test', { default: 'converted' });

    await service.create(dto);
    const result = await service.convert(
      { decoratedProps: { metadata: { name: 'default' } } } as any,
      ['test', 'test2'],
    );
    expect(result).toEqual(['converted', 'test2']);
  });
});
