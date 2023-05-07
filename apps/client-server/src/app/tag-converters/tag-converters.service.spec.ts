import { MikroORM } from '@mikro-orm/core';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '../database/database.module';
import { CreateTagConverterDto } from './dtos/create-tag-converter.dto';
import { TagConvertersService } from './tag-converters.service';

describe('TagConvertersService', () => {
  let service: TagConvertersService;
  let module: TestingModule;
  let orm: MikroORM;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [TagConvertersService],
    }).compile();

    service = module.get<TagConvertersService>(TagConvertersService);
    orm = module.get(MikroORM);
    try {
      await orm.getSchemaGenerator().ensureDatabase();
    } catch {
      // none
    }
    try {
      await orm.getSchemaGenerator().refreshDatabase();
    } catch {
      // none
    }
  });

  afterAll(async () => {
    await orm.close(true);
    await module.close();
    //cleanTestDatabase();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create entities', async () => {
    const dto: CreateTagConverterDto = new CreateTagConverterDto();
    dto.tag = 'test';
    dto.convertTo = {
      default: 'converted',
    };

    await service.create(dto);
    const converters = await service.findAll();
    expect(converters).toHaveLength(1);
    expect(converters[0].tag).toEqual(dto.tag);
    expect(converters[0].convertTo).toEqual(dto.convertTo);
  });
});
