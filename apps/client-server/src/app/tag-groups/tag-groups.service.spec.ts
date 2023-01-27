import { Test, TestingModule } from '@nestjs/testing';
import { TagGroupsService } from './tag-groups.service';

describe('TagGroupsService', () => {
  let service: TagGroupsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TagGroupsService],
    }).compile();

    service = module.get<TagGroupsService>(TagGroupsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
