import { BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase, EntityNotFoundError } from '@postybirb/database';
import { DefaultDescription } from '@postybirb/types';
import {
    EntityCreatedEvent,
    EntityRemovedEvent,
    EntityUpdatedEvent,
    getEntityCrudEventNames,
} from '../common/events/entity-crud.events';
import { CUSTOM_SHORTCUT_EVENT_PREFIX } from './custom-shortcut.events';
import { CustomShortcutsService } from './custom-shortcuts.service';
import { CreateCustomShortcutDto } from './dtos/create-custom-shortcut.dto';
import { UpdateCustomShortcutDto } from './dtos/update-custom-shortcut.dto';

describe('CustomShortcutsService', () => {
  let service: CustomShortcutsService;
  let module: TestingModule;
  const emit = jest.fn();
  const eventNames = getEntityCrudEventNames(CUSTOM_SHORTCUT_EVENT_PREFIX);

  function createDto(name: string) {
    const dto = new CreateCustomShortcutDto();
    dto.name = name;
    return dto;
  }

  beforeEach(async () => {
    clearDatabase();
    emit.mockClear();
    module = await Test.createTestingModule({
      providers: [
        CustomShortcutsService,
        { provide: EventEmitter2, useValue: { emit } },
      ],
    }).compile();

    service = module.get<CustomShortcutsService>(CustomShortcutsService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create entities', async () => {
    const dto = createDto('shortcut-a');

    const record = await service.create(dto);
    const list = await service.findAll();

    expect(list).toHaveLength(1);
    expect(list[0].name).toBe(dto.name);
    expect(emit).toHaveBeenCalledWith(
      eventNames.created,
      new EntityCreatedEvent(record.toDTO()),
    );
  });

  it('should fail to create duplicate named shortcuts', async () => {
    await service.create(createDto('shortcut-a'));
    emit.mockClear();

    await expect(
      service.create(createDto('shortcut-a')),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(emit).not.toHaveBeenCalled();
  });

  it('should update entities', async () => {
    const record = await service.create(createDto('shortcut-a'));
    emit.mockClear();

    const updateDto = new UpdateCustomShortcutDto();
    updateDto.name = 'shortcut-a';
    updateDto.shortcut = DefaultDescription();
    const updated = await service.update(record.id, updateDto);

    expect(emit).toHaveBeenCalledWith(
      eventNames.updated,
      new EntityUpdatedEvent(updated.toDTO()),
    );
  });

  it('should not emit when updating a missing entity', async () => {
    const updateDto = new UpdateCustomShortcutDto();
    updateDto.name = 'missing';
    updateDto.shortcut = DefaultDescription();

    await expect(
      service.update('missing', updateDto),
    ).rejects.toBeInstanceOf(EntityNotFoundError);
    expect(emit).not.toHaveBeenCalled();
  });

  it('should delete entities', async () => {
    const record = await service.create(createDto('shortcut-a'));
    emit.mockClear();

    await service.remove(record.id);
    expect(await service.findAll()).toHaveLength(0);
    expect(emit).toHaveBeenCalledWith(
      eventNames.removed,
      new EntityRemovedEvent(record.id),
    );
  });

  it('should throw and not emit when removing a missing entity', async () => {
    await expect(service.remove('missing')).rejects.toBeInstanceOf(
      EntityNotFoundError,
    );
    expect(emit).not.toHaveBeenCalled();
  });
});
