import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import {
    EntityUpdatedEvent,
    getEntityCrudEventNames,
} from '../common/events/entity-crud.events';
import { UpdateSettingsDto } from './dtos/update-settings.dto';
import { SETTINGS_EVENT_PREFIX } from './settings.events';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let service: SettingsService;
  let module: TestingModule;
  const emit = jest.fn();
  const eventNames = getEntityCrudEventNames(SETTINGS_EVENT_PREFIX);

  beforeEach(async () => {
    clearDatabase();
    emit.mockClear();
    module = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: EventEmitter2, useValue: { emit } },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    await service.onModuleInit();
  });

  afterAll(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should update entities and emit an updated event', async () => {
    const groups = await service.findAll();
    expect(groups).toHaveLength(1);

    const record = groups[0];

    const updateDto = new UpdateSettingsDto();
    updateDto.settings = {
      desktopNotifications: {
        enabled: true,
        showOnDirectoryWatcherError: true,
        showOnDirectoryWatcherSuccess: true,
        showOnPostError: true,
        showOnPostSuccess: true,
      },
      tagSearchProvider: {
        id: undefined,
        showWikiInHelpOnHover: false,
      },
      hiddenWebsites: ['test'],
      allowAd: true,
      queuePaused: false,
    };
    const updated = await service.update(record.id, updateDto);
    const updatedRec = await service.findByIdOrThrow(record.id);
    expect(updatedRec.settings).toEqual(updateDto.settings);
    expect(emit).toHaveBeenCalledWith(
      eventNames.updated,
      [new EntityUpdatedEvent(updated.toDTO())],
    );
  });
});
