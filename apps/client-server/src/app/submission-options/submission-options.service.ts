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
  FileSubmission,
  ISubmission,
  ISubmissionFields,
  ISubmissionMetadata,
  MessageSubmission,
  PostData,
  SubmissionMetadataType,
  SubmissionRating,
  SubmissionType,
  ValidationResult,
} from '@postybirb/types';
import { AccountService } from '../account/account.service';
import { Submission, SubmissionAccountData } from '../database/entities';
import { PostyBirbRepository } from '../database/repositories/postybirb-repository';
import { SubmissionService } from '../submission/services/submission.service';
import { isFileWebsite } from '../websites/models/website-modifiers/file-website';
import { isMessageWebsite } from '../websites/models/website-modifiers/message-website';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { CreateSubmissionOptionsDto } from './dtos/create-submission-options.dto';
import { UpdateSubmissionOptionsDto } from './dtos/update-submission-options.dto';
import { ValidateSubmissionOptionsDto } from './dtos/validate-submission-options.dto';

@Injectable()
export class SubmissionOptionsService {
  private readonly logger = Logger(SubmissionOptionsService.name);

  constructor(
    @InjectRepository(Submission)
    private readonly submissionRepository: PostyBirbRepository<
      Submission<SubmissionMetadataType>
    >,
    @InjectRepository(SubmissionAccountData)
    private readonly submissionOptionsRepository: PostyBirbRepository<SubmissionAccountData>,
    @Inject(forwardRef(() => SubmissionService))
    private readonly submissionService: SubmissionService,
    private readonly websiteRegistry: WebsiteRegistryService,
    private readonly accountService: AccountService
  ) {}

  async create<T extends ISubmissionFields>(
    createSubmissionOptions: CreateSubmissionOptionsDto<T>
  ) {
    const account = await this.accountService.findOne(
      createSubmissionOptions.accountId
    );

    let submission: Submission<SubmissionMetadataType>;
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

  async findOne(id: string): Promise<SubmissionAccountData> {
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
    updateSubmissionOptionsDto: UpdateSubmissionOptionsDto
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
    submission: Submission<ISubmissionMetadata>,
    title: string
  ): SubmissionAccountData {
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
  ): Promise<ValidationResult<ISubmissionFields>> {
    const { defaultOptions, options, accountId, submissionId } = validate;
    const submission = await this.submissionService.findOne(submissionId);
    const account = await this.accountService.findOne(accountId);
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
        postData as unknown as PostData<FileSubmission, ISubmissionFields>
      );
    }

    if (
      submission.type === SubmissionType.MESSAGE &&
      isMessageWebsite(websiteInstance)
    ) {
      return websiteInstance.onValidateMessageSubmission(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        postData as unknown as PostData<MessageSubmission, ISubmissionFields>
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
   * @param {IBaseWebsiteOptions} options
   * @return {*}  {Promise<
   *     PostData<ISubmission<IBaseSubmissionMetadata>, IBaseWebsiteOptions>
   *   >}
   */
  private async getPostData(
    submission: ISubmission,
    defaultOptions: ISubmissionFields,
    options: ISubmissionFields
  ): Promise<PostData<ISubmission<ISubmissionMetadata>, ISubmissionFields>> {
    const data: PostData<ISubmission, ISubmissionFields> = {
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
