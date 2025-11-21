import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import { CreateUserConverterDto } from './dtos/create-user-converter.dto';
import { UpdateUserConverterDto } from './dtos/update-user-converter.dto';
import { UserConvertersService } from './user-converters.service';

describe('UserConvertersService', () => {
  let service: UserConvertersService;
  let module: TestingModule;

  function createUserConverterDto(
    username: string,
    convertTo: Record<string, string>,
  ) {
    const dto = new CreateUserConverterDto();
    dto.username = username;
    dto.convertTo = convertTo;
    return dto;
  }

  beforeEach(async () => {
    clearDatabase();
    try {
      module = await Test.createTestingModule({
        imports: [],
        providers: [UserConvertersService],
      }).compile();

      service = module.get<UserConvertersService>(UserConvertersService);
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
    const dto = createUserConverterDto('my_friend', {
      default: 'converted_friend',
    });

    const record = await service.create(dto);
    const converters = await service.findAll();
    expect(converters).toHaveLength(1);
    expect(converters[0].username).toEqual(dto.username);
    expect(converters[0].convertTo).toEqual(dto.convertTo);
    expect(record.toObject()).toEqual({
      username: dto.username,
      convertTo: dto.convertTo,
      id: record.id,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  });

  it('should fail to create duplicate user converters', async () => {
    const dto = createUserConverterDto('my_friend', {
      default: 'converted_friend',
    });
    const dto2 = createUserConverterDto('my_friend', {
      default: 'converted_friend2',
    });

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
    const dto = createUserConverterDto('my_friend', {
      default: 'converted_friend',
    });

    const record = await service.create(dto);
    const converters = await service.findAll();
    expect(converters).toHaveLength(1);

    const updateDto = new UpdateUserConverterDto();
    updateDto.username = 'my_friend';
    updateDto.convertTo = {
      default: 'converted_friend',
      bluesky: 'converted_friend2',
    };
    await service.update(record.id, updateDto);
    const updatedRec = await service.findById(record.id);
    expect(updatedRec.username).toBe(updateDto.username);
    expect(updatedRec.convertTo).toEqual(updateDto.convertTo);
  });

  it('should delete entities', async () => {
    const dto = createUserConverterDto('my_friend', {
      default: 'converted_friend',
    });

    const record = await service.create(dto);
    expect(await service.findAll()).toHaveLength(1);

    await service.remove(record.id);
    expect(await service.findAll()).toHaveLength(0);
  });

  it('should convert usernames', async () => {
    const dto = createUserConverterDto('my_friend', {
      default: 'default_friend',
      bluesky: 'friend.bsky.social',
    });

    await service.create(dto);

    // Test conversion for bluesky
    const resultBluesky = await service.convert(
      { decoratedProps: { metadata: { name: 'bluesky' } } } as any,
      'my_friend',
    );
    expect(resultBluesky).toEqual('friend.bsky.social');

    // Test conversion for unknown website (should use default)
    const resultDefault = await service.convert(
      { decoratedProps: { metadata: { name: 'unknown' } } } as any,
      'my_friend',
    );
    expect(resultDefault).toEqual('default_friend');

    // Test conversion for username not in converter (should return original)
    const resultNotFound = await service.convert(
      { decoratedProps: { metadata: { name: 'bluesky' } } } as any,
      'unknown_user',
    );
    expect(resultNotFound).toEqual('unknown_user');
  });
});
