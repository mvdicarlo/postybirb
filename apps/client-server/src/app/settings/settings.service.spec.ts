import { MikroORM } from '@mikro-orm/core';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '../database/database.module';
import { UpdateSettingsDto } from './dtos/update-settings.dto';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let service: SettingsService;
  let module: TestingModule;
  let orm: MikroORM;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [SettingsService],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    orm = module.get(MikroORM);
    try {
      await orm.getSchemaGenerator().refreshDatabase();
    } catch {
      // none
    }
    await service.onModuleInit();
  });

  afterAll(async () => {
    await orm.close(true);
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
