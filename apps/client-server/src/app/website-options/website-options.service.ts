import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountId,
  DynamicObject,
  FileSubmission,
  ISubmissionMetadata,
  IWebsiteFormFields,
  MessageSubmission,
  NULL_ACCOUNT_ID,
  PostData,
  SubmissionMetadataType,
  SubmissionType,
  ValidationResult,
} from '@postybirb/types';
import { AccountService } from '../account/account.service';
import { PostyBirbService } from '../common/service/postybirb-service';
import { Submission, WebsiteOptions } from '../database/entities';
import { PostyBirbRepository } from '../database/repositories/postybirb-repository';
import { FormGeneratorService } from '../form-generator/form-generator.service';
import { PostParsersService } from '../post-parsers/post-parsers.service';
import { SubmissionService } from '../submission/services/submission.service';
import { UserSpecifiedWebsiteOptionsService } from '../user-specified-website-options/user-specified-website-options.service';
import { DefaultWebsiteOptionsObject } from '../websites/models/default-website-options';
import { isFileWebsite } from '../websites/models/website-modifiers/file-website';
import { isMessageWebsite } from '../websites/models/website-modifiers/message-website';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { CreateWebsiteOptionsDto } from './dtos/create-website-options.dto';
import { UpdateWebsiteOptionsDto } from './dtos/update-website-options.dto';
import { ValidateWebsiteOptionsDto } from './dtos/validate-website-options.dto';

@Injectable()
export class WebsiteOptionsService extends PostyBirbService<WebsiteOptions> {
  constructor(
    @InjectRepository(WebsiteOptions)
    readonly repository: PostyBirbRepository<WebsiteOptions>,
    @InjectRepository(Submission)
    private readonly submissionRepository: PostyBirbRepository<
      Submission<SubmissionMetadataType>
    >,
    @Inject(forwardRef(() => SubmissionService))
    private readonly submissionService: SubmissionService,
    private readonly websiteRegistry: WebsiteRegistryService,
    private readonly accountService: AccountService,
    private readonly userSpecifiedOptionsService: UserSpecifiedWebsiteOptionsService,
    private readonly postParserService: PostParsersService,
    private readonly formGeneratorService: FormGeneratorService
  ) {
    super(repository);
  }

  /**
   * Creates a submission option for a submission.
   *
   * @param {Submission} submission
   * @param {AccountId} accountId
   * @param {DynamicObject} data
   * @param {string} [title]
   */
  async createOption(
    submission: Submission,
    accountId: AccountId,
    data: DynamicObject,
    title?: string
  ) {
    const account = await this.accountService.findById(accountId, {
      failOnMissing: true,
    });
    const isDefault = accountId === NULL_ACCOUNT_ID;

    const userDefinedDefaultOptions =
      await this.userSpecifiedOptionsService.findByAccountAndSubmissionType(
        accountId,
        submission.type
      );

    const mergedData = {
      ...(isDefault ? DefaultWebsiteOptionsObject : {}), // Only merge default options if this is the default option
      ...(userDefinedDefaultOptions?.options ?? {}), // Merge user defined options
      ...data, // Merge user defined data
      title, // Override title (optional)
    };

    const option = this.repository.create({
      submission,
      account,
      data: mergedData,
    });

    return option;
  }

  async create<T extends IWebsiteFormFields>(
    createDto: CreateWebsiteOptionsDto<T>
  ) {
    const account = await this.accountService.findById(createDto.account, {
      failOnMissing: true,
    });

    let submission: Submission<SubmissionMetadataType>;
    try {
      submission = await this.submissionRepository.findOneOrFail(
        createDto.submission
      );
    } catch {
      throw new NotFoundException(
        `Submission ${createDto.submission} not found.`
      );
    }

    const exists: WebsiteOptions = submission.options
      .toArray()
      .find((option) => option.account.id === account.id);
    if (exists) {
      // Opt to just update the existing option
      return this.update(exists.id, { data: createDto.data });
    }

    const formFields =
      account.id === NULL_ACCOUNT_ID
        ? await this.formGeneratorService.getDefaultForm(submission.type)
        : await this.formGeneratorService.generateForm({
            accountId: account.id,
            type: submission.type,
          });
    // Populate with the form fields to get the default values
    const websiteData: IWebsiteFormFields = {
      ...Object.entries(formFields).reduce(
        (acc, [key, field]) => ({
          ...acc,
          [key]:
            createDto.data?.[key as keyof IWebsiteFormFields] === undefined
              ? field.defaultValue
              : createDto.data?.[key as keyof IWebsiteFormFields],
        }),
        {} as IWebsiteFormFields
      ),
    };
    const submissionOptions = new WebsiteOptions({
      submission,
      data: websiteData,
      account,
    });

    await this.repository.persistAndFlush(submissionOptions);

    return submissionOptions;
  }

  update(id: string, update: UpdateWebsiteOptionsDto) {
    this.logger.withMetadata(update).info(`Updating WebsiteOptions '${id}'`);
    return this.repository.update(id, update);
  }

  /**
   * Creates the default submission option that stores shared data
   * across multiple submission options.
   *
   * @param {Submission<ISubmissionMetadata>} submission
   * @param {string} title
   * @return {*}  {Promise<WebsiteOptions>}
   */
  async createDefaultSubmissionOptions(
    submission: Submission<ISubmissionMetadata>,
    title: string
  ): Promise<WebsiteOptions> {
    this.logger
      .withMetadata({ id: submission.id })
      .info('Creating Default Website Options');
    const options = new WebsiteOptions({
      isDefault: true,
      submission,
      account: await this.accountService.findById(NULL_ACCOUNT_ID),
    });

    await this.populateDefaultWebsiteOptions(submission.type, options, title);
    return options;
  }

  private async populateDefaultWebsiteOptions(
    type: SubmissionType,
    entity: WebsiteOptions,
    title?: string
  ) {
    const defaultOptions =
      (
        await this.userSpecifiedOptionsService.findByAccountAndSubmissionType(
          NULL_ACCOUNT_ID,
          type
        )
      )?.options ?? {};
    Object.assign(entity, {
      data: {
        ...DefaultWebsiteOptionsObject,
        ...defaultOptions,
        title,
      },
    });
  }

  /**
   * Validates a submission option against a website instance.
   * @param {ValidateWebsiteOptionsDto} validate
   * @return {Promise<ValidationResult>}
   */
  async validateWebsiteOption(
    validate: ValidateWebsiteOptionsDto
  ): Promise<ValidationResult> {
    const { options, account: accountId, submission: submissionId } = validate;
    const submission = await this.submissionService.findById(submissionId, {
      failOnMissing: true,
    });
    const account = await this.accountService.findById(accountId, {
      failOnMissing: true,
    });
    const websiteInstance = this.websiteRegistry.findInstance(account);

    const postData = await this.postParserService.parse(
      submission,
      websiteInstance,
      {
        // Wrap the options in a WebsiteOptions object
        account,
        submission,
        data: options,
        isDefault: false,
        id: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );
    if (
      submission.type === SubmissionType.FILE &&
      isFileWebsite(websiteInstance)
    ) {
      return websiteInstance.onValidateFileSubmission(
        postData as unknown as PostData<FileSubmission, IWebsiteFormFields>
      );
    }

    if (
      submission.type === SubmissionType.MESSAGE &&
      isMessageWebsite(websiteInstance)
    ) {
      return websiteInstance.onValidateMessageSubmission(
        postData as unknown as PostData<MessageSubmission, IWebsiteFormFields>
      );
    }

    throw new BadRequestException(
      'Could not determine validation type or website does not support submission type.'
    );
  }

  /**
   * Validates all submission options for a submission.
   * @param {string} submissionId
   * @return {*}  {Promise<ValidationResult[]>}
   */
  async validateSubmission(submissionId: string) {
    const websiteOptions = await this.repository.find({
      submission: submissionId,
    });

    const defaultOption = websiteOptions.find((option) => option.isDefault)
      ?.data ?? { ...DefaultWebsiteOptionsObject };

    const results = await Promise.allSettled(
      websiteOptions
        .filter((option) => !option.isDefault)
        .map((option) =>
          this.validateWebsiteOption({
            submission: submissionId,
            account: option.account.id,
            options: option.data,
            defaultOptions: defaultOption,
          })
        )
    );

    return results.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }

      this.logger.error('Failed to validate website option', result.reason);
      return {
        errors: [
          {
            id: 'validation.error.unknown',
            values: {},
          },
        ],
      };
    });
  }
}
