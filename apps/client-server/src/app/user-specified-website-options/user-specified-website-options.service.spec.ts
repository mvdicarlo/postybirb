import { MikroORM } from '@mikro-orm/core';
import { Test, TestingModule } from '@nestjs/testing';
import { NULL_ACCOUNT_ID, SubmissionType } from '@postybirb/types';
import { AccountModule } from '../account/account.module';
import { AccountService } from '../account/account.service';
import { DatabaseModule } from '../database/database.module';
import { CreateUserSpecifiedWebsiteOptionsDto } from './dtos/create-user-specified-website-options.dto';
import { UserSpecifiedWebsiteOptionsService } from './user-specified-website-options.service';

describe('UserSpecifiedWebsiteOptionsService', () => {
  let service: UserSpecifiedWebsiteOptionsService;
  let module: TestingModule;
  let orm: MikroORM;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [DatabaseModule, AccountModule],
      providers: [UserSpecifiedWebsiteOptionsService],
    }).compile();

    service = module.get<UserSpecifiedWebsiteOptionsService>(
      UserSpecifiedWebsiteOptionsService
    );
    orm = module.get(MikroORM);
    try {
      await orm.getSchemaGenerator().refreshDatabase();
    } catch {
      // none
    }

    const accountService = module.get<AccountService>(AccountService);
    await accountService.onModuleInit();
  });

  afterAll(async () => {
    await orm.close(true);
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create entities', async () => {
    const dto = new CreateUserSpecifiedWebsiteOptionsDto();
    dto.account = NULL_ACCOUNT_ID;
    dto.options = { test: 'test' };
    dto.type = SubmissionType.MESSAGE;

    const record = await service.create(dto);
    expect(await service.findAll()).toHaveLength(1);
    expect(record.options).toEqual(dto.options);
    expect(record.type).toEqual(dto.type);
    expect(record.toJSON()).toEqual({
      account: NULL_ACCOUNT_ID,
      createdAt: record.createdAt.toISOString(),
      id: record.id,
      options: dto.options,
      type: dto.type,
      updatedAt: record.updatedAt.toISOString(),
    });
  });
});
