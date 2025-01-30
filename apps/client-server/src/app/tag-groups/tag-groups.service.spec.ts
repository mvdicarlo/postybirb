import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import { CreateTagGroupDto } from './dtos/create-tag-group.dto';
import { TagGroupsService } from './tag-groups.service';

describe('TagGroupsService', () => {
  let service: TagGroupsService;
  let module: TestingModule;

  function createTagGroupDto(name: string, tags: string[]) {
    const dto = new CreateTagGroupDto();
    dto.name = name;
    dto.tags = tags;
    return dto;
  }

  beforeEach(async () => {
    clearDatabase();
    module = await Test.createTestingModule({
      providers: [TagGroupsService],
    }).compile();

    service = module.get<TagGroupsService>(TagGroupsService);
  });

  afterAll(async () => {
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
  });

  it('should fail to create duplicate named groups', async () => {
    const dto = createTagGroupDto('test', ['test']);
    const dto2 = createTagGroupDto('test', ['test', 'test-dupe']);

    await service.create(dto);
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
  });

  it('should update entities', async () => {
    const dto = createTagGroupDto('test', ['test', 'tag group']);

    const record = await service.create(dto);
    const groups = await service.findAll();
    expect(groups).toHaveLength(1);

    const updateDto = new CreateTagGroupDto();
    updateDto.name = 'test';
    updateDto.tags = ['test', 'updated'];
    await service.update(record.id, updateDto);
    const updatedRec = await service.findById(record.id);
    expect(updatedRec.name).toBe(updateDto.name);
    expect(updatedRec.tags).toEqual(updateDto.tags);
  });

  it('should delete entities', async () => {
    const dto = createTagGroupDto('test', ['test', 'tag group']);

    const record = await service.create(dto);
    expect(await service.findAll()).toHaveLength(1);

    await service.remove(record.id);
    expect(await service.findAll()).toHaveLength(0);
  });
});
