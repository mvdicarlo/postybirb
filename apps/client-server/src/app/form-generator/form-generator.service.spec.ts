import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import {
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
      rating: {
        required: true,
        section: 'common',
        order: 1,
        span: 12,
        layout: 'horizontal',
        label: 'rating',
        formField: 'rating',
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
        type: 'rating',
        responsive: {
          xs: 12,
        },
        defaultValue: 'ADULT',
      },
      title: {
        required: true,
        section: 'common',
        order: 2,
        span: 12,
        defaultValue: '',
        formField: 'input',
        label: 'title',
        type: 'title',
        responsive: {
          xs: 12,
        },
      },
      tags: {
        section: 'common',
        order: 3,
        span: 12,
        formField: 'tag',
        label: 'tags',
        defaultValue: {
          overrideDefault: false,
          tags: [],
        },
        minTagLength: 1,
        spaceReplacer: '_',
        type: 'tag',
        responsive: {
          xs: 12,
        },
      },
      description: {
        section: 'common',
        order: 4,
        span: 12,
        label: 'description',
        formField: 'description',
        defaultValue: {
          overrideDefault: false,
          description: [],
        },
        descriptionType: 'html',
        type: 'description',
        responsive: {
          xs: 12,
        },
      },
      contentWarning: {
        label: 'contentWarning',
        section: 'common',
        order: 5,
        span: 12,
        hidden: false,
        defaultValue: '',
        formField: 'input',
        type: 'text',
        responsive: {
          xs: 12,
        },
      },
    });
  });

  it('should return standard form', async () => {
    const messageForm = await service.getDefaultForm(SubmissionType.MESSAGE);
    expect(messageForm).toEqual({
      rating: {
        required: true,
        section: 'common',
        order: 1,
        span: 12,
        layout: 'horizontal',
        label: 'rating',
        formField: 'rating',
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
        type: 'rating',
        responsive: {
          xs: 12,
        },
        defaultValue: 'GENERAL',
      },
      title: {
        required: true,
        section: 'common',
        order: 2,
        span: 12,
        defaultValue: '',
        formField: 'input',
        label: 'title',
        type: 'title',
        responsive: {
          xs: 12,
        },
      },
      tags: {
        section: 'common',
        order: 3,
        span: 12,
        formField: 'tag',
        label: 'tags',
        defaultValue: {
          overrideDefault: false,
          tags: [],
        },
        minTagLength: 1,
        spaceReplacer: '_',
        type: 'tag',
        responsive: {
          xs: 12,
        },
      },
      description: {
        section: 'common',
        order: 4,
        span: 12,
        label: 'description',
        formField: 'description',
        defaultValue: {
          overrideDefault: false,
          description: [],
        },
        descriptionType: 'html',
        type: 'description',
        responsive: {
          xs: 12,
        },
      },
      contentWarning: {
        label: 'contentWarning',
        section: 'common',
        order: 5,
        span: 12,
        hidden: false,
        defaultValue: '',
        formField: 'input',
        type: 'text',
        responsive: {
          xs: 12,
        },
      },
    });

    const fileForm = await service.getDefaultForm(SubmissionType.FILE);
    expect(fileForm).toEqual({
      rating: {
        required: true,
        section: 'common',
        order: 1,
        span: 12,
        layout: 'horizontal',
        label: 'rating',
        formField: 'rating',
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
        type: 'rating',
        responsive: {
          xs: 12,
        },
        defaultValue: 'GENERAL',
      },
      title: {
        required: true,
        section: 'common',
        order: 2,
        span: 12,
        defaultValue: '',
        formField: 'input',
        label: 'title',
        type: 'title',
        responsive: {
          xs: 12,
        },
      },
      tags: {
        section: 'common',
        order: 3,
        span: 12,
        formField: 'tag',
        label: 'tags',
        defaultValue: {
          overrideDefault: false,
          tags: [],
        },
        minTagLength: 1,
        spaceReplacer: '_',
        type: 'tag',
        responsive: {
          xs: 12,
        },
      },
      description: {
        section: 'common',
        order: 4,
        span: 12,
        label: 'description',
        formField: 'description',
        defaultValue: {
          overrideDefault: false,
          description: [],
        },
        descriptionType: 'html',
        type: 'description',
        responsive: {
          xs: 12,
        },
      },
      contentWarning: {
        label: 'contentWarning',
        section: 'common',
        order: 5,
        span: 12,
        hidden: false,
        defaultValue: '',
        formField: 'input',
        type: 'text',
        responsive: {
          xs: 12,
        },
      },
    });
  });
});
