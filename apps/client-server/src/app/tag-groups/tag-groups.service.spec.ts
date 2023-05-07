import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '../database/database.module';
import {
  cleanTestDatabase,
  initializeDatabase,
} from '../database/mikro-orm.providers';
import { TagGroupsService } from './tag-groups.service';
import { CreateTagGroupDto } from './dtos/create-tag-group.dto';
import { waitUntil } from '../utils/wait.util';

describe('TagGroupsService', () => {
  let service: TagGroupsService;
  let testingModule: TestingModule;

  beforeAll(async () => {
    await initializeDatabase();
  });

  beforeEach(async () => {
    testingModule = await Test.createTestingModule({
      imports: [DatabaseModule],
      providers: [TagGroupsService],
    }).compile();

    service = testingModule.get<TagGroupsService>(TagGroupsService);
    // await waitUntil(() => true, 3000);
  });

  afterEach(async () => {
    await testingModule.close();
  });

  afterAll(() => {
    cleanTestDatabase();
  });

  // it('should be defined', () => {
  //   expect(service).toBeDefined();
  // });

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
