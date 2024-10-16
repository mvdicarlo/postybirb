import { InjectRepository } from '@mikro-orm/nestjs';
import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountId,
  DynamicObject,
  ISubmission,
  ISubmissionMetadata,
  IWebsiteFormFields,
  NULL_ACCOUNT_ID,
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
import { ValidationService } from '../validation/validation.service';
import { DefaultWebsiteOptionsObject } from '../websites/models/default-website-options';
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
    private readonly formGeneratorService: FormGeneratorService,
    private readonly validationService: ValidationService
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
    submission: ISubmission,
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

    let submission: ISubmission<SubmissionMetadataType>;
    try {
      submission = await this.submissionRepository.findOneOrFail(
        createDto.submission
      );
    } catch {
      throw new NotFoundException(
        `Submission ${createDto.submission} not found.`
      );
    }

    const exists = submission.options
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
    submission: ISubmission<ISubmissionMetadata>,
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
    const { websiteOptionId, submission: submissionId } = validate;
    const submission = await this.submissionService.findById(submissionId, {
      failOnMissing: true,
    });
    const websiteOption = submission.options.find(
      (option) => option.id === websiteOptionId
    );
    return this.validationService.validate(submission, websiteOption);
  }

  /**
   * Validates all submission options for a submission.
   * @param {string} submissionId
   * @return {*}  {Promise<ValidationResult[]>}
   */
  async validateSubmission(submissionId: string) {
    const submission = await this.submissionService.findById(submissionId, {
      failOnMissing: true,
    });
    return this.validationService.validateSubmission(submission);
  }
}
