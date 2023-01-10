import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Log, Logger } from '@postybirb/logger';
import {
  BaseWebsiteOptions,
  IBaseSubmissionMetadata,
  SubmissionMetadataType,
  SubmissionRating,
} from '@postybirb/types';
import { AccountService } from '../account/account.service';
import { Submission, SubmissionOptions } from '../database/entities';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { CreateSubmissionOptionsDto } from './dtos/create-submission-options.dto';
import { UpdateSubmissionOptionsDto } from './dtos/update-submission-options.dto';
import { SubmissionService } from '../submission/services/submission.service';

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
}
