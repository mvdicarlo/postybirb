import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NULL_ACCOUNT_ID, SubmissionType } from '@postybirb/types';
import { AccountModule } from '../account/account.module';
import { AccountService } from '../account/account.service';
import { clearDatabase } from '../drizzle/postybirb-database/database-instance';
import { CreateUserSpecifiedWebsiteOptionsDto } from './dtos/create-user-specified-website-options.dto';
import { UpdateUserSpecifiedWebsiteOptionsDto } from './dtos/update-user-specified-website-options.dto';
import { UserSpecifiedWebsiteOptionsService } from './user-specified-website-options.service';

describe('UserSpecifiedWebsiteOptionsService', () => {
  let service: UserSpecifiedWebsiteOptionsService;
  let module: TestingModule;

  beforeEach(async () => {
    clearDatabase();
    module = await Test.createTestingModule({
      imports: [AccountModule],
      providers: [UserSpecifiedWebsiteOptionsService],
    }).compile();

    service = module.get<UserSpecifiedWebsiteOptionsService>(
      UserSpecifiedWebsiteOptionsService,
    );

    const accountService = module.get<AccountService>(AccountService);
    await accountService.onModuleInit();
  });

  afterAll(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create entities', async () => {
    const dto = new CreateUserSpecifiedWebsiteOptionsDto();
    dto.accountId = NULL_ACCOUNT_ID;
    dto.options = { test: 'test' };
    dto.type = SubmissionType.MESSAGE;

    const record = await service.create(dto);
    expect(await service.findAll()).toHaveLength(1);
    expect(record.options).toEqual(dto.options);
    expect(record.type).toEqual(dto.type);
    expect(record.toDTO()).toEqual({
      accountId: NULL_ACCOUNT_ID,
      createdAt: record.createdAt,
      id: record.id,
      options: dto.options,
      type: dto.type,
      updatedAt: record.updatedAt,
    });
  });

  it('should fail to create a duplicate entity', async () => {
    const dto = new CreateUserSpecifiedWebsiteOptionsDto();
    dto.accountId = NULL_ACCOUNT_ID;
    dto.options = { test: 'test' };
    dto.type = SubmissionType.MESSAGE;

    await service.create(dto);
    await expect(service.create(dto)).rejects.toThrow(BadRequestException);
  });

  it('should update entities', async () => {
    const dto = new CreateUserSpecifiedWebsiteOptionsDto();
    dto.accountId = NULL_ACCOUNT_ID;
    dto.options = { test: 'test' };
    dto.type = SubmissionType.MESSAGE;

    const record = await service.create(dto);
    const options = { ...record.options };

    const updateDto = new UpdateUserSpecifiedWebsiteOptionsDto();
    updateDto.type = SubmissionType.MESSAGE;
    updateDto.options = { test: 'updated' };
    const updateRecord = await service.update(record.id, updateDto);
    expect(record.id).toEqual(updateRecord.id);
    expect(options).not.toEqual(updateRecord.options);
  });
});
