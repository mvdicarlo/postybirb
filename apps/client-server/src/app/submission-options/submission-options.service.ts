import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Log, Logger } from '@postybirb/logger';
import {
  BaseWebsiteOptions,
  FileSubmission,
  FileWebsiteOptions,
  IBaseSubmissionMetadata,
  ISubmission,
  MessageSubmission,
  PostData,
  SubmissionMetadataType,
  SubmissionRating,
  SubmissionType,
  ValidationResult,
} from '@postybirb/types';
import { AccountService } from '../account/account.service';
import { Submission, SubmissionOptions } from '../database/entities';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { CreateSubmissionOptionsDto } from './dtos/create-submission-options.dto';
import { UpdateSubmissionOptionsDto } from './dtos/update-submission-options.dto';
import { SubmissionService } from '../submission/services/submission.service';
import { ValidateSubmissionOptionsDto } from './dtos/validate-submission-options.dto';
import { isFileWebsite } from '../websites/models/website-modifiers/file-website';
import { isMessageWebsite } from '../websites/models/website-modifiers/message-website';

@Injectable()
export class SubmissionOptionsService {
  private readonly logger = Logger(SubmissionOptionsService.name);

  constructor(
    @InjectRepository(Submission)
    private readonly submissionRepository: EntityRepository<
      Submission<SubmissionMetadataType>
    >,
    @InjectRepository(SubmissionOptions)
    private readonly submissionOptionsRepository: EntityRepository<
      SubmissionOptions<BaseWebsiteOptions>
    >,
    @Inject(forwardRef(() => SubmissionService))
    private readonly submissionService: SubmissionService,
    private readonly websiteRegistry: WebsiteRegistryService,
    private readonly accountService: AccountService
  ) {}

  async create<T extends BaseWebsiteOptions>(
    createSubmissionOptions: CreateSubmissionOptionsDto<T>
  ) {
    const account = await this.accountService.findOne(
      createSubmissionOptions.accountId
    );

    let submission: Submission<IBaseSubmissionMetadata>;
    try {
      submission = await this.submissionRepository.findOneOrFail(
        createSubmissionOptions.submissionId
      );
    } catch {
      throw new NotFoundException(
        `Submission ${createSubmissionOptions.submissionId} not found.`
      );
    }

    if (
      submission.options
        .toArray()
        .some((option) => option.account?.id === account.id)
    ) {
      throw new BadRequestException(
        `Submission option with account id ${account.id} already exists on ${submission.id}. Use update operation instead.`
      );
    }

    const submissionOptions = this.submissionOptionsRepository.create({
      submission,
      data: createSubmissionOptions.data,
      account,
    });

    await this.submissionOptionsRepository.persistAndFlush(submissionOptions);

    return submissionOptions;
  }

  async findOne(id: string): Promise<SubmissionOptions<BaseWebsiteOptions>> {
    try {
      return await this.submissionOptionsRepository.findOneOrFail(id);
    } catch {
      throw new NotFoundException(id);
    }
  }

  /**
   * Deleted a submission option matching the Id provided.
   *
   * @param {string} id
   * @return {*}  {Promise<DeleteResult>}
   */
  @Log()
  async remove(id: string): Promise<void> {
    await this.submissionOptionsRepository.remove(await this.findOne(id));
  }

  /**
   * Updates a submission option matching the Id provided.
   *
   * @param {string} id
   * @param {UpdateSubmissionOptionsDto} updateSubmissionOptionsDto
   * @return {*}  {Promise<boolean>}
   */
  @Log()
  async update(
    updateSubmissionOptionsDto: UpdateSubmissionOptionsDto<BaseWebsiteOptions>
  ): Promise<boolean> {
    try {
      const options = await this.findOne(updateSubmissionOptionsDto.id);
      options.data = updateSubmissionOptionsDto.data;
      await this.submissionOptionsRepository.flush();
      this.submissionService.emit();
      return true;
    } catch (err) {
      throw new BadRequestException(err);
    }
  }

  /**
   * Creates the default submission option that stores shared data
   * across multiple submission options.
   *
   * @param {Submission<IBaseSubmissionMetadata>} submission
   * @return {*}  {SubmissionOptions<SafeObject>}
   */
  createDefaultSubmissionOptions(
    submission: Submission<IBaseSubmissionMetadata>,
    title: string
  ): SubmissionOptions<BaseWebsiteOptions> {
    const submissionOptions = this.submissionOptionsRepository.create({
      isDefault: true,
      submission,
      data: {
        title,
        rating: SubmissionRating.GENERAL,
        tags: {
          tags: [],
          overrideDefault: false,
        },
      },
    });

    return submissionOptions;
  }

  /**
   * Validates a submission option against a website instance.
   * @todo create a validation return type
   * @param {ValidateSubmissionOptionsDto} validate
   * @return {Promise<ValidationResult>}
   */
  async validateSubmissionOption(
    validate: ValidateSubmissionOptionsDto
  ): Promise<ValidationResult<BaseWebsiteOptions>> {
    const { options, accountId, submissionId } = validate;
    const submission = await this.submissionService.findOne(submissionId);
    const account = await this.accountService.findOne(accountId);
    const websiteInstance = this.websiteRegistry.findInstance(account);

    const postData = await this.getPostData(submission, options);
    if (
      submission.type === SubmissionType.FILE &&
      isFileWebsite(websiteInstance)
    ) {
      return websiteInstance.onValidateFileSubmission(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        postData as unknown as PostData<FileSubmission, FileWebsiteOptions>
      );
    }

    if (
      submission.type === SubmissionType.MESSAGE &&
      isMessageWebsite(websiteInstance)
    ) {
      return websiteInstance.onValidateMessageSubmission(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        postData as unknown as PostData<MessageSubmission, BaseWebsiteOptions>
      );
    }

    throw new BadRequestException(
      'Could not determine validation type or website does not support submission type.'
    );
  }

  /**
   * Creates the simple post data required to post and validate a submission.
   * NOTE: this will probably be split out later as real posting is considered.
   * @param {ISubmission} submission
   * @param {BaseWebsiteOptions} options
   * @return {*}  {Promise<
   *     PostData<ISubmission<IBaseSubmissionMetadata>, BaseWebsiteOptions>
   *   >}
   */
  private async getPostData(
    submission: ISubmission,
    options: BaseWebsiteOptions
  ): Promise<
    PostData<ISubmission<IBaseSubmissionMetadata>, BaseWebsiteOptions>
  > {
    const data: PostData<ISubmission, BaseWebsiteOptions> = {
      submission,
      options,
    };

    const defaultOptions = submission.options
      .toArray()
      .find((o) => o.isDefault);

    if (defaultOptions) {
      if (!data.options.description) {
        data.options.description = defaultOptions.data.description;
      }

      // Override description
      // TODO put description through parser once that is figured out
      if (data.options.description?.overrideDefault === true) {
        data.options.description = defaultOptions.data.description;
      }

      if (!data.options.tags) {
        data.options.tags = defaultOptions.data.tags;
      }

      // Merge tags
      if (data.options.tags?.overrideDefault === true) {
        data.options.tags.tags.push(...defaultOptions.data.tags.tags);
      }
    } else {
      throw new InternalServerErrorException(
        `Default options not found for submission ${submission.id}`
      );
    }

    return data;
  }
}
