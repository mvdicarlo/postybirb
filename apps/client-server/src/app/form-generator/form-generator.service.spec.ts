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
      UserSpecifiedWebsiteOptionsService
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
      service.generateForm({ accountId: 'fake', type: SubmissionType.MESSAGE })
    ).rejects.toThrow(NotFoundException);
  });

  it('should return user specific defaults', async () => {
    const userSpecifiedDto = new CreateUserSpecifiedWebsiteOptionsDto();
    userSpecifiedDto.accountId = new NullAccount().id;
    userSpecifiedDto.type = SubmissionType.MESSAGE;
    userSpecifiedDto.options = { rating: SubmissionRating.ADULT };
    await userSpecifiedService.create(userSpecifiedDto);

    const messageForm = await service.getDefaultForm(SubmissionType.MESSAGE);
    expect(messageForm).toMatchInlineSnapshot(`
      {
        "contentWarning": {
          "defaultValue": "",
          "formField": "input",
          "hidden": false,
          "label": "contentWarning",
          "order": 5,
          "responsive": {
            "xs": 12,
          },
          "section": "common",
          "span": 12,
          "type": "text",
        },
        "description": {
          "defaultValue": {
            "description": {
              "content": [],
              "type": "doc",
            },
            "overrideDefault": false,
          },
          "descriptionType": "html",
          "formField": "description",
          "label": "description",
          "order": 4,
          "required": true,
          "responsive": {
            "xs": 12,
          },
          "section": "common",
          "span": 12,
          "type": "description",
        },
        "rating": {
          "defaultValue": "ADULT",
          "formField": "rating",
          "label": "rating",
          "layout": "horizontal",
          "options": [
            {
              "label": "General",
              "value": "GENERAL",
            },
            {
              "label": "Mature",
              "value": "MATURE",
            },
            {
              "label": "Adult",
              "value": "ADULT",
            },
            {
              "label": "Extreme",
              "value": "EXTREME",
            },
          ],
          "order": 1,
          "required": true,
          "responsive": {
            "xs": 12,
          },
          "section": "common",
          "span": 12,
          "type": "rating",
        },
        "tags": {
          "defaultValue": {
            "overrideDefault": false,
            "tags": [],
          },
          "formField": "tag",
          "label": "tags",
          "minTagLength": 1,
          "order": 3,
          "responsive": {
            "xs": 12,
          },
          "section": "common",
          "spaceReplacer": "_",
          "span": 12,
          "type": "tag",
        },
        "title": {
          "defaultValue": "",
          "expectedInDescription": false,
          "formField": "input",
          "label": "title",
          "order": 2,
          "required": true,
          "responsive": {
            "xs": 12,
          },
          "section": "common",
          "span": 12,
          "type": "title",
        },
      }
    `);
  });

  it('should return standard form', async () => {
    const messageForm = await service.getDefaultForm(SubmissionType.MESSAGE);
    expect(messageForm).toMatchInlineSnapshot(`
      {
        "contentWarning": {
          "defaultValue": "",
          "formField": "input",
          "hidden": false,
          "label": "contentWarning",
          "order": 5,
          "responsive": {
            "xs": 12,
          },
          "section": "common",
          "span": 12,
          "type": "text",
        },
        "description": {
          "defaultValue": {
            "description": {
              "content": [],
              "type": "doc",
            },
            "overrideDefault": false,
          },
          "descriptionType": "html",
          "formField": "description",
          "label": "description",
          "order": 4,
          "required": true,
          "responsive": {
            "xs": 12,
          },
          "section": "common",
          "span": 12,
          "type": "description",
        },
        "rating": {
          "defaultValue": "GENERAL",
          "formField": "rating",
          "label": "rating",
          "layout": "horizontal",
          "options": [
            {
              "label": "General",
              "value": "GENERAL",
            },
            {
              "label": "Mature",
              "value": "MATURE",
            },
            {
              "label": "Adult",
              "value": "ADULT",
            },
            {
              "label": "Extreme",
              "value": "EXTREME",
            },
          ],
          "order": 1,
          "required": true,
          "responsive": {
            "xs": 12,
          },
          "section": "common",
          "span": 12,
          "type": "rating",
        },
        "tags": {
          "defaultValue": {
            "overrideDefault": false,
            "tags": [],
          },
          "formField": "tag",
          "label": "tags",
          "minTagLength": 1,
          "order": 3,
          "responsive": {
            "xs": 12,
          },
          "section": "common",
          "spaceReplacer": "_",
          "span": 12,
          "type": "tag",
        },
        "title": {
          "defaultValue": "",
          "expectedInDescription": false,
          "formField": "input",
          "label": "title",
          "order": 2,
          "required": true,
          "responsive": {
            "xs": 12,
          },
          "section": "common",
          "span": 12,
          "type": "title",
        },
      }
    `);

    const fileForm = await service.getDefaultForm(SubmissionType.FILE);
    expect(fileForm).toMatchInlineSnapshot(`
      {
        "contentWarning": {
          "defaultValue": "",
          "formField": "input",
          "hidden": false,
          "label": "contentWarning",
          "order": 5,
          "responsive": {
            "xs": 12,
          },
          "section": "common",
          "span": 12,
          "type": "text",
        },
        "description": {
          "defaultValue": {
            "description": {
              "content": [],
              "type": "doc",
            },
            "overrideDefault": false,
          },
          "descriptionType": "html",
          "formField": "description",
          "label": "description",
          "order": 4,
          "required": true,
          "responsive": {
            "xs": 12,
          },
          "section": "common",
          "span": 12,
          "type": "description",
        },
        "rating": {
          "defaultValue": "GENERAL",
          "formField": "rating",
          "label": "rating",
          "layout": "horizontal",
          "options": [
            {
              "label": "General",
              "value": "GENERAL",
            },
            {
              "label": "Mature",
              "value": "MATURE",
            },
            {
              "label": "Adult",
              "value": "ADULT",
            },
            {
              "label": "Extreme",
              "value": "EXTREME",
            },
          ],
          "order": 1,
          "required": true,
          "responsive": {
            "xs": 12,
          },
          "section": "common",
          "span": 12,
          "type": "rating",
        },
        "tags": {
          "defaultValue": {
            "overrideDefault": false,
            "tags": [],
          },
          "formField": "tag",
          "label": "tags",
          "minTagLength": 1,
          "order": 3,
          "responsive": {
            "xs": 12,
          },
          "section": "common",
          "spaceReplacer": "_",
          "span": 12,
          "type": "tag",
        },
        "title": {
          "defaultValue": "",
          "expectedInDescription": false,
          "formField": "input",
          "label": "title",
          "order": 2,
          "required": true,
          "responsive": {
            "xs": 12,
          },
          "section": "common",
          "span": 12,
          "type": "title",
        },
      }
    `);
  });
});
