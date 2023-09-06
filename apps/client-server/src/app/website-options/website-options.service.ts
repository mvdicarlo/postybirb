import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  FileSubmission,
  ISubmission,
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
import { SubmissionService } from '../submission/services/submission.service';
import { DefaultWebsiteOptionsObject } from '../websites/models/default-website-options';
import { isFileWebsite } from '../websites/models/website-modifiers/file-website';
import { isMessageWebsite } from '../websites/models/website-modifiers/message-website';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { CreateWebsiteOptionsDto } from './dtos/create-website-options.dto';
import { UpdateWebsiteOptionsDto } from './dtos/update-website-options.dto';
import { ValidateWebsiteOptionsDto } from './dtos/validate-website-options.dto';
import { UserSpecifiedWebsiteOptionsService } from '../user-specified-website-options/user-specified-website-options.service';

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
    private readonly userSpecifiedOptionsService: UserSpecifiedWebsiteOptionsService
  ) {
    super(repository);
  }

  async create<T extends IWebsiteFormFields>(
    createSubmissionOptions: CreateWebsiteOptionsDto<T>
  ) {
    const account = await this.accountService.findById(
      createSubmissionOptions.account,
      { failOnMissing: true }
    );

    let submission: Submission<SubmissionMetadataType>;
    try {
      submission = await this.submissionRepository.findOneOrFail(
        createSubmissionOptions.submission
      );
    } catch {
      throw new NotFoundException(
        `Submission ${createSubmissionOptions.submission} not found.`
      );
    }

    if (
      submission.options
        .toArray()
        .some((option) => option.account.id === account.id)
    ) {
      throw new BadRequestException(
        `Submission option with account id ${account.id} already exists on ${submission.id}. Use update operation instead.`
      );
    }

    const submissionOptions = this.repository.create({
      submission,
      data: createSubmissionOptions.data,
      account,
    });

    await this.repository.persistAndFlush(submissionOptions);

    return submissionOptions;
  }

  update(id: string, update: UpdateWebsiteOptionsDto) {
    this.logger.info(update, `Updating WebsiteOptions '${id}'`);
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
    this.logger.info({ id: submission.id }, 'Creating Default Website Options');
    const defaultOptions =
      (
        await this.userSpecifiedOptionsService.findByAccountAndSubmissionType(
          NULL_ACCOUNT_ID,
          submission.type
        )
      ).options ?? {};
    const submissionOptions = this.repository.create(
      {
        isDefault: true,
        submission,
        account: await this.accountService.findById(NULL_ACCOUNT_ID),
        data: {
          ...DefaultWebsiteOptionsObject,
          ...defaultOptions,
          title,
        },
      },
      { persist: false }
    );

    return submissionOptions;
  }

  /**
   * Validates a submission option against a website instance.
   * @param {ValidateWebsiteOptionsDto} validate
   * @return {Promise<ValidationResult>}
   */
  async validateWebsiteOption(
    validate: ValidateWebsiteOptionsDto
  ): Promise<ValidationResult<IWebsiteFormFields>> {
    const {
      defaultOptions,
      options,
      account: accountId,
      submission: submissionId,
    } = validate;
    const submission = await this.submissionService.findById(submissionId, {
      failOnMissing: true,
    });
    const account = await this.accountService.findById(accountId, {
      failOnMissing: true,
    });
    const websiteInstance = this.websiteRegistry.findInstance(account);

    const postData = await this.getPostData(
      submission,
      defaultOptions,
      options
    );
    if (
      submission.type === SubmissionType.FILE &&
      isFileWebsite(websiteInstance)
    ) {
      return websiteInstance.onValidateFileSubmission(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        postData as unknown as PostData<FileSubmission, IWebsiteFormFields>
      );
    }

    if (
      submission.type === SubmissionType.MESSAGE &&
      isMessageWebsite(websiteInstance)
    ) {
      return websiteInstance.onValidateMessageSubmission(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        postData as unknown as PostData<MessageSubmission, IWebsiteFormFields>
      );
    }

    throw new BadRequestException(
      'Could not determine validation type or website does not support submission type.'
    );
  }

  /**
   * Creates the simple post data required to post and validate a submission.
   * NOTE: this will probably be split out later as real posting is considered.
   *
   * @private
   * @param {ISubmission} submission
   * @param {IWebsiteFormFields} defaultOptions
   * @param {IWebsiteFormFields} options
   * @return {*}  {Promise<PostData<ISubmission<ISubmissionMetadata>, IWebsiteFormFields>>}
   */
  private async getPostData(
    submission: ISubmission,
    defaultOptions: IWebsiteFormFields,
    options: IWebsiteFormFields
  ): Promise<PostData<ISubmission<ISubmissionMetadata>, IWebsiteFormFields>> {
    const data: PostData<ISubmission, IWebsiteFormFields> = {
      submission,
      options,
    };

    if (defaultOptions) {
      if (!data.options.description) {
        data.options.description = defaultOptions.description;
      }

      // Override description
      // TODO put description through parser once that is figured out
      if (data.options.description.overrideDefault === false) {
        data.options.description = defaultOptions.description;
      }

      if (!data.options.tags) {
        data.options.tags = defaultOptions.tags;
      }

      // Merge tags
      if (data.options.tags.overrideDefault === false) {
        data.options.tags.tags.push(...defaultOptions.tags.tags);
      }
    } else {
      throw new InternalServerErrorException(
        `Default options not found for submission ${submission.id}`
      );
    }

    return data;
  }
}
