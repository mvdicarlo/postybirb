import { MikroORM } from '@mikro-orm/core';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  DefaultDescriptionValue,
  DefaultTagValue,
  NULL_ACCOUNT_ID,
  SubmissionRating,
  SubmissionType,
} from '@postybirb/types';
import { AccountModule } from '../account/account.module';
import { AccountService } from '../account/account.service';
import { DatabaseModule } from '../database/database.module';
import { FileService } from '../file/file.service';
import { CreateFileService } from '../file/services/create-file.service';
import { UpdateFileService } from '../file/services/update-file.service';
import { FileSubmissionService } from '../submission/services/file-submission.service';
import { MessageSubmissionService } from '../submission/services/message-submission.service';
import { SubmissionService } from '../submission/services/submission.service';
import { UserSpecifiedWebsiteOptionsService } from '../user-specified-website-options/user-specified-website-options.service';
import { WebsiteOptionsService } from '../website-options/website-options.service';
import { WebsiteImplProvider } from '../websites/implementations';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { CreateSubmissionTemplateDto } from './dtos/create-submission-template.dto';
import { SubmissionTemplatesService } from './submission-templates.service';
import { UpdateSubmissionTemplateDto } from './dtos/update-submission-template.dto';

describe('SubmissionTemplatesService', () => {
  let service: SubmissionTemplatesService;
  let accountService: AccountService;
  let websiteOptionsService: WebsiteOptionsService;
  let module: TestingModule;
  let orm: MikroORM;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [DatabaseModule, AccountModule],
      providers: [
        SubmissionTemplatesService,
        SubmissionService,
        CreateFileService,
        UpdateFileService,
        FileService,
        SubmissionService,
        FileSubmissionService,
        MessageSubmissionService,
        AccountService,
        WebsiteRegistryService,
        WebsiteOptionsService,
        WebsiteImplProvider,
        UserSpecifiedWebsiteOptionsService,
      ],
    }).compile();

    service = module.get<SubmissionTemplatesService>(
      SubmissionTemplatesService
    );
    accountService = module.get<AccountService>(AccountService);
    websiteOptionsService = module.get<WebsiteOptionsService>(
      WebsiteOptionsService
    );
    orm = module.get(MikroORM);
    try {
      await orm.getSchemaGenerator().refreshDatabase();
    } catch {
      // none
    }
    await accountService.onModuleInit();
  });

  afterAll(async () => {
    await orm.close(true);
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create entity', async () => {
    const dto = new CreateSubmissionTemplateDto();
    dto.name = 'test template';
    dto.type = SubmissionType.MESSAGE;

    const record = await service.create(dto);
    const records = await service.findAll();
    expect(records).toHaveLength(1);
    expect(record.options).toHaveLength(1);

    const option = record.options[0];
    expect(record.toJSON()).toEqual({
      createdAt: record.createdAt.toISOString(),
      id: record.id,
      name: dto.name,
      options: [option.toJSON()],
      type: SubmissionType.MESSAGE,
      updatedAt: record.updatedAt.toISOString(),
    });
  });

  it('should throw exception on invalid name', async () => {
    const dto = new CreateSubmissionTemplateDto();
    dto.name = ' ';
    await expect(service.create(dto)).rejects.toThrow(BadRequestException);
  });

  it('should throw exception on duplicate entity', async () => {
    const dto = new CreateSubmissionTemplateDto();
    dto.name = 'test';
    dto.type = SubmissionType.FILE;
    await service.create(dto);
    await expect(service.create(dto)).rejects.toThrow(BadRequestException);
  });

  it('should update entities', async () => {
    const createDto = new CreateSubmissionTemplateDto();
    createDto.name = 'test template';
    createDto.type = SubmissionType.MESSAGE;

    const record = await service.create(createDto);
    const optionId = record.options[0].id;

    const updateDto = new UpdateSubmissionTemplateDto();
    updateDto.name = 'updated template';
    updateDto.options = [
      {
        submission: undefined,
        account: NULL_ACCOUNT_ID,
        data: {
          title: 'title',
          tags: DefaultTagValue,
          description: DefaultDescriptionValue,
          rating: SubmissionRating.GENERAL,
        },
      },
    ];

    const updatedRecord = await service.update(record.id, updateDto);
    expect(updatedRecord.name).toBe(updateDto.name);
    expect(updatedRecord.options).toHaveLength(1);
    expect(updatedRecord.options[0].id).not.toBe(optionId);
  });

  it('should remove entities', async () => {
    const dto = new CreateSubmissionTemplateDto();
    dto.name = 'test template';
    dto.type = SubmissionType.MESSAGE;

    const record = await service.create(dto);
    expect(await service.findAll()).toHaveLength(1);
    expect(await websiteOptionsService.findAll()).toHaveLength(1);

    await service.remove(record.id);

    expect(await service.findAll()).toHaveLength(0);
    expect(await websiteOptionsService.findAll()).toHaveLength(0);
  });
});
