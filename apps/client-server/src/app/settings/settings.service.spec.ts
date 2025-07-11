import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import { UpdateSettingsDto } from './dtos/update-settings.dto';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let service: SettingsService;
  let module: TestingModule;

  beforeEach(async () => {
    clearDatabase();
    module = await Test.createTestingModule({
      providers: [SettingsService],
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

  it('should update entities', async () => {
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
      language: 'en',
      allowAd: true,
      queuePaused: false,
    };
    await service.update(record.id, updateDto);
    const updatedRec = await service.findById(record.id);
    expect(updatedRec.settings).toEqual(updateDto.settings);
  });
});
