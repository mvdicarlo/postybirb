import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import { CreateTagConverterDto } from './dtos/create-tag-converter.dto';
import { UpdateTagConverterDto } from './dtos/update-tag-converter.dto';
import { TagConvertersService } from './tag-converters.service';

describe('TagConvertersService', () => {
  let service: TagConvertersService;
  let module: TestingModule;

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
    try {
      module = await Test.createTestingModule({
        imports: [],
        providers: [TagConvertersService],
      }).compile();

      service = module.get<TagConvertersService>(TagConvertersService);
    } catch (e) {
      console.log(e);
    }
  });

  afterAll(async () => {
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
  });

  it('should fail to create duplicate tag converters', async () => {
    const dto = createTagConverterDto('test', { default: 'converted' });
    const dto2 = createTagConverterDto('test', { default: 'converted' });

    await service.create(dto);

    let expectedException = null;
    try {
      await service.create(dto2);
    } catch (err) {
      expectedException = err;
    }
    expect(expectedException).toBeInstanceOf(BadRequestException);
  });

  it('should update entities', async () => {
    const dto = createTagConverterDto('test', { default: 'converted' });

    const record = await service.create(dto);
    const groups = await service.findAll();
    expect(groups).toHaveLength(1);

    const updateDto = new UpdateTagConverterDto();
    updateDto.tag = 'test';
    updateDto.convertTo = { default: 'converted', test: 'converted2' };
    await service.update(record.id, updateDto);
    const updatedRec = await service.findById(record.id);
    expect(updatedRec.tag).toBe(updateDto.tag);
    expect(updatedRec.convertTo).toEqual(updateDto.convertTo);
  });

  it('should delete entities', async () => {
    const dto = createTagConverterDto('test', { default: 'converted' });

    const record = await service.create(dto);
    expect(await service.findAll()).toHaveLength(1);

    await service.remove(record.id);
    expect(await service.findAll()).toHaveLength(0);
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
