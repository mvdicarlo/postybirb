import { MikroORM } from '@mikro-orm/core';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '../database/database.module';
import { CreateTagGroupDto } from './dtos/create-tag-group.dto';
import { TagGroupsService } from './tag-groups.service';
import { cleanTestDatabase } from '../database/mikro-orm.providers';

describe('TagGroupsService', () => {
  let service: TagGroupsService;
  let module: TestingModule;
  let orm: MikroORM;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [TagGroupsService],
    }).compile();

    service = module.get<TagGroupsService>(TagGroupsService);
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
    const dto: CreateTagGroupDto = new CreateTagGroupDto();
    dto.name = 'test';
    dto.tags = ['test', 'tag group'];

    await service.create(dto);
    const groups = await service.findAll();
    expect(groups).toHaveLength(1);
    expect(groups[0].name).toEqual(dto.name);
    expect(groups[0].tags).toEqual(dto.tags);
  });
});
