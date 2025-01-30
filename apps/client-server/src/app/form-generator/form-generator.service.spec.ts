import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import {
  DefaultDescriptionValue,
  DefaultTagValue,
  DescriptionType,
  NullAccount,
  SubmissionRating,
  SubmissionType,
} from '@postybirb/types';
import { AccountModule } from '../account/account.module';
import { AccountService } from '../account/account.service';
import { CreateUserSpecifiedWebsiteOptionsDto } from '../user-specified-website-options/dtos/create-user-specified-website-options.dto';
import { UserSpecifiedWebsiteOptionsModule } from '../user-specified-website-options/user-specified-website-options.module';
import { UserSpecifiedWebsiteOptionsService } from '../user-specified-website-options/user-specified-website-options.service';
import { WebsitesModule } from '../websites/websites.module';
import { FormGeneratorService } from './form-generator.service';

describe('FormGeneratorService', () => {
  let service: FormGeneratorService;
  let userSpecifiedService: UserSpecifiedWebsiteOptionsService;
  let accountService: AccountService;
  let module: TestingModule;

  beforeEach(async () => {
    clearDatabase();
    module = await Test.createTestingModule({
      imports: [
        AccountModule,
        WebsitesModule,
        UserSpecifiedWebsiteOptionsModule,
      ],
      providers: [FormGeneratorService],
    }).compile();

    service = module.get<FormGeneratorService>(FormGeneratorService);
    accountService = module.get<AccountService>(AccountService);
    userSpecifiedService = module.get<UserSpecifiedWebsiteOptionsService>(
      UserSpecifiedWebsiteOptionsService,
    );

    await accountService.onModuleInit();
  });

  afterAll(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should fail on missing account', async () => {
    await expect(
      service.generateForm({ accountId: 'fake', type: SubmissionType.MESSAGE }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should return user specific defaults', async () => {
    const userSpecifiedDto = new CreateUserSpecifiedWebsiteOptionsDto();
    userSpecifiedDto.accountId = new NullAccount().id;
    userSpecifiedDto.type = SubmissionType.MESSAGE;
    userSpecifiedDto.options = { rating: SubmissionRating.ADULT };
    await userSpecifiedService.create(userSpecifiedDto);

    const messageForm = await service.getDefaultForm(SubmissionType.MESSAGE);
    expect(messageForm).toEqual({
      contentWarning: {
        col: 1,
        defaultValue: '',
        formField: 'input',
        label: 'contentWarning',
        row: 2,
        type: 'text',
      },
      description: {
        col: 1,
        defaultValue: {
          description: [],
          overrideDefault: false,
        },
        formField: 'description',
        label: 'description',
        row: 3,
        type: 'description',
        descriptionType: DescriptionType.HTML,
      },
      rating: {
        col: 0,
        defaultValue: 'ADULT',
        formField: 'rating',
        label: 'rating',
        layout: 'vertical',
        options: [
          {
            label: 'General',
            value: 'GENERAL',
          },
          {
            label: 'Mature',
            value: 'MATURE',
          },
          {
            label: 'Adult',
            value: 'ADULT',
          },
          {
            label: 'Extreme',
            value: 'EXTREME',
          },
        ],
        required: true,
        row: 0,
        type: 'rating',
      },
      tags: {
        col: 1,
        defaultValue: {
          overrideDefault: false,
          tags: [],
        },
        formField: 'tag',
        label: 'tags',
        row: 1,
        type: 'tag',
      },
      title: {
        col: 1,
        defaultValue: '',
        formField: 'input',
        label: 'title',
        required: true,
        row: 0,
        type: 'title',
      },
    });
  });

  it('should return standard form', async () => {
    const messageForm = await service.getDefaultForm(SubmissionType.MESSAGE);
    expect(messageForm).toEqual({
      contentWarning: {
        col: 1,
        defaultValue: '',
        formField: 'input',
        label: 'contentWarning',
        row: 2,
        type: 'text',
      },
      description: {
        col: 1,
        defaultValue: DefaultDescriptionValue(),
        formField: 'description',
        label: 'description',
        row: 3,
        type: 'description',
        descriptionType: DescriptionType.HTML,
      },
      rating: {
        col: 0,
        defaultValue: 'GENERAL',
        formField: 'rating',
        label: 'rating',
        layout: 'vertical',
        options: [
          {
            label: 'General',
            value: 'GENERAL',
          },
          {
            label: 'Mature',
            value: 'MATURE',
          },
          {
            label: 'Adult',
            value: 'ADULT',
          },
          {
            label: 'Extreme',
            value: 'EXTREME',
          },
        ],
        required: true,
        row: 0,
        type: 'rating',
      },
      tags: {
        col: 1,
        defaultValue: DefaultTagValue(),
        formField: 'tag',
        label: 'tags',
        row: 1,
        type: 'tag',
      },
      title: {
        col: 1,
        defaultValue: '',
        formField: 'input',
        label: 'title',
        required: true,
        row: 0,
        type: 'title',
      },
    });

    const fileForm = await service.getDefaultForm(SubmissionType.FILE);
    expect(fileForm).toEqual({
      contentWarning: {
        col: 1,
        defaultValue: '',
        formField: 'input',
        label: 'contentWarning',
        row: 2,
        type: 'text',
      },
      description: {
        col: 1,
        defaultValue: DefaultDescriptionValue(),
        formField: 'description',
        label: 'description',
        row: 3,
        type: 'description',
        descriptionType: DescriptionType.HTML,
      },
      rating: {
        col: 0,
        defaultValue: 'GENERAL',
        formField: 'rating',
        label: 'rating',
        layout: 'vertical',
        options: [
          {
            label: 'General',
            value: 'GENERAL',
          },
          {
            label: 'Mature',
            value: 'MATURE',
          },
          {
            label: 'Adult',
            value: 'ADULT',
          },
          {
            label: 'Extreme',
            value: 'EXTREME',
          },
        ],
        required: true,
        row: 0,
        type: 'rating',
      },
      tags: {
        col: 1,
        defaultValue: DefaultTagValue(),
        formField: 'tag',
        label: 'tags',
        row: 1,
        type: 'tag',
      },
      title: {
        col: 1,
        defaultValue: '',
        formField: 'input',
        label: 'title',
        required: true,
        row: 0,
        type: 'title',
      },
    });
  });
});
