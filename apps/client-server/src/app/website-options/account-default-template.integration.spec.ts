/**
 * Regression coverage for account → default template association.
 *
 * Verifies that the AccountTemplateDefaultsService resolves the right option
 * for an account/type pair, and that FormGeneratorService bakes those values
 * into the field `defaultValue`s the UI uses when creating new website options.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { clearDatabase } from '@postybirb/database';
import {
    DefaultDescriptionValue,
    DefaultTagValue,
    SubmissionRating,
    SubmissionType,
} from '@postybirb/types';
import { AccountTemplateDefaultsService } from '../account/account-template-defaults.service';
import { AccountModule } from '../account/account.module';
import { AccountService } from '../account/account.service';
import { CreateAccountDto } from '../account/dtos/create-account.dto';
import { FileConverterService } from '../file-converter/file-converter.service';
import { FileService } from '../file/file.service';
import { CreateFileService } from '../file/services/create-file.service';
import { UpdateFileService } from '../file/services/update-file.service';
import { FormGeneratorModule } from '../form-generator/form-generator.module';
import { FormGeneratorService } from '../form-generator/form-generator.service';
import { SharpInstanceManager } from '../image-processing/sharp-instance-manager';
import { TestPlatformModule } from '../platform/testing/test-platform.module';
import { PostParsersModule } from '../post-parsers/post-parsers.module';
import { CreateSubmissionDto } from '../submission/dtos/create-submission.dto';
import { FileSubmissionService } from '../submission/services/file-submission.service';
import { MessageSubmissionService } from '../submission/services/message-submission.service';
import { SubmissionDeltaService } from '../submission/services/submission-delta.service';
import { SubmissionService } from '../submission/services/submission.service';
import { ValidationService } from '../validation/validation.service';
import { WebsiteImplProvider } from '../websites/implementations/provider';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { WebsitesModule } from '../websites/websites.module';
import { CreateWebsiteOptionsDto } from './dtos/create-website-options.dto';
import { WebsiteOptionsService } from './website-options.service';

describe('Account default template association', () => {
  let module: TestingModule;
  let accountService: AccountService;
  let submissionService: SubmissionService;
  let websiteOptionsService: WebsiteOptionsService;
  let formGeneratorService: FormGeneratorService;
  let resolver: AccountTemplateDefaultsService;

  async function createAccount() {
    const dto = new CreateAccountDto();
    dto.groups = ['test'];
    dto.name = 'test';
    dto.website = 'test';
    return accountService.create(dto);
  }

  async function createTemplate(type: SubmissionType) {
    const dto = new CreateSubmissionDto();
    dto.name = 'tmpl';
    dto.type = type;
    dto.isTemplate = true;
    return submissionService.create(dto);
  }

  beforeEach(async () => {
    clearDatabase();
    module = await Test.createTestingModule({
      imports: [
        TestPlatformModule,
        WebsitesModule,
        AccountModule,
        PostParsersModule,
        FormGeneratorModule,
      ],
      providers: [
        SubmissionService,
        SubmissionDeltaService,
        CreateFileService,
        UpdateFileService,
        SharpInstanceManager,
        FileService,
        FileSubmissionService,
        MessageSubmissionService,
        AccountService,
        WebsiteRegistryService,
        ValidationService,
        WebsiteOptionsService,
        WebsiteImplProvider,
        FileConverterService,
      ],
    }).compile();

    accountService = module.get(AccountService);
    submissionService = module.get(SubmissionService);
    websiteOptionsService = module.get(WebsiteOptionsService);
    formGeneratorService = module.get(FormGeneratorService);
    resolver = module.get(AccountTemplateDefaultsService);
    await accountService.onModuleInit();
  });

  afterEach(async () => {
    await module.close();
  });

  describe('AccountTemplateDefaultsService.resolveDefaults', () => {
    it('returns the template option matching the account for the type', async () => {
      const account = await createAccount();
      const template = await createTemplate(SubmissionType.MESSAGE);

      await websiteOptionsService.create({
        accountId: account.id,
        submissionId: template.id,
        data: {
          title: 'tmpl-title',
          contentWarning: 'tmpl-cw',
          tags: DefaultTagValue(),
          description: DefaultDescriptionValue(),
          rating: SubmissionRating.MATURE,
        },
      } as CreateWebsiteOptionsDto);

      await accountService.update(account.id, {
        name: account.name,
        groups: account.groups,
        defaultMessageTemplateId: template.id,
      });

      const resolved = await resolver.resolveDefaults(
        account.id,
        SubmissionType.MESSAGE,
      );
      expect(resolved).toBeDefined();
      expect(resolved?.title).toEqual('tmpl-title');
      expect(resolved?.contentWarning).toEqual('tmpl-cw');
      expect(resolved?.rating).toEqual(SubmissionRating.MATURE);
    });

    it('returns undefined when the account has no template associated', async () => {
      const account = await createAccount();
      expect(
        await resolver.resolveDefaults(account.id, SubmissionType.MESSAGE),
      ).toBeUndefined();
    });

    it('is type-scoped: a MESSAGE association is not used for FILE', async () => {
      const account = await createAccount();
      const template = await createTemplate(SubmissionType.MESSAGE);

      await websiteOptionsService.create({
        accountId: account.id,
        submissionId: template.id,
        data: {
          title: 'should-not-apply',
          tags: DefaultTagValue(),
          description: DefaultDescriptionValue(),
          rating: SubmissionRating.GENERAL,
        },
      } as CreateWebsiteOptionsDto);

      await accountService.update(account.id, {
        name: account.name,
        groups: account.groups,
        defaultMessageTemplateId: template.id,
      });

      expect(
        await resolver.resolveDefaults(account.id, SubmissionType.FILE),
      ).toBeUndefined();
    });

    it('returns undefined when the template has no option for this account', async () => {
      const accountA = await createAccount();
      const accountB = await createAccount();
      const template = await createTemplate(SubmissionType.MESSAGE);

      // Seed the template with an option for accountB only
      await websiteOptionsService.create({
        accountId: accountB.id,
        submissionId: template.id,
        data: {
          title: 'b-only',
          tags: DefaultTagValue(),
          description: DefaultDescriptionValue(),
          rating: SubmissionRating.GENERAL,
        },
      } as CreateWebsiteOptionsDto);

      // Associate the template with accountA — no matching option exists
      await accountService.update(accountA.id, {
        name: accountA.name,
        groups: accountA.groups,
        defaultMessageTemplateId: template.id,
      });

      expect(
        await resolver.resolveDefaults(accountA.id, SubmissionType.MESSAGE),
      ).toBeUndefined();
    });
  });

  describe('FormGeneratorService.generateForm', () => {
    it('bakes template defaults into field defaultValues for the UI to consume', async () => {
      const account = await createAccount();
      const template = await createTemplate(SubmissionType.MESSAGE);

      await websiteOptionsService.create({
        accountId: account.id,
        submissionId: template.id,
        data: {
          title: 'baked-title',
          contentWarning: 'baked-cw',
          tags: DefaultTagValue(),
          description: DefaultDescriptionValue(),
          rating: SubmissionRating.ADULT,
        },
      } as CreateWebsiteOptionsDto);

      await accountService.update(account.id, {
        name: account.name,
        groups: account.groups,
        defaultMessageTemplateId: template.id,
      });

      const form = await formGeneratorService.generateForm({
        accountId: account.id,
        type: SubmissionType.MESSAGE,
      });

      // The UI uses these defaultValues to seed a new website option's data.
      expect(form.title.defaultValue).toEqual('baked-title');
      expect(form.contentWarning.defaultValue).toEqual('baked-cw');
      expect(form.rating.defaultValue).toEqual(SubmissionRating.ADULT);
    });

    it('leaves built-in defaults intact when no template is associated', async () => {
      const account = await createAccount();

      const form = await formGeneratorService.generateForm({
        accountId: account.id,
        type: SubmissionType.MESSAGE,
      });

      expect(form.title.defaultValue).toEqual('');
      expect(form.contentWarning.defaultValue).toEqual('');
      // rating intentionally has no default for non-default-account forms
      // (it "inherits from default" when left unset), so we don't assert it.
    });
  });
});
