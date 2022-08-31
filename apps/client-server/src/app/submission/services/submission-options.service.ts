import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { formBuilder, FormBuilderMetadata } from '@postybirb/form-builder';
import { Log, Logger } from '@postybirb/logger';
import { Primitive } from 'type-fest';
import { AccountService } from '../../account/account.service';
import { Submission, SubmissionOptions } from '../../database/entities';
import { isFileWebsite } from '../../websites/models/website-modifiers/file-website';
import { isMessageWebsite } from '../../websites/models/website-modifiers/message-website';
import { UnknownWebsite } from '../../websites/website';
import { WebsiteRegistryService } from '../../websites/website-registry.service';
import { CreateSubmissionOptionsDto } from '../dtos/create-submission-options.dto';
import { SubmissionOptionsModelRequestDto } from '../dtos/submission-options-model-request.dto';
import { UpdateSubmissionOptionsDto } from '../dtos/update-submission-options.dto';
import SubmissionType from '../enums/submission-type';
import { IBaseSubmissionMetadata } from '../models/base-submission-metadata';
import { BaseOptions } from '../models/base-website-options';
import { SubmissionMetadataType } from '../models/submission-metadata-types';

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
      SubmissionOptions<BaseOptions>
    >,
    private readonly websiteRegistry: WebsiteRegistryService,
    private readonly accountService: AccountService
  ) {}

  async create<T extends BaseOptions>(
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

  async findOne(id: string): Promise<SubmissionOptions<BaseOptions>> {
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
    updateSubmissionOptionsDto: UpdateSubmissionOptionsDto<BaseOptions>
  ): Promise<boolean> {
    try {
      const options = await this.findOne(updateSubmissionOptionsDto.id);
      options.data = updateSubmissionOptionsDto.data;
      await this.submissionOptionsRepository.flush();

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
    submission: Submission<IBaseSubmissionMetadata>
  ): SubmissionOptions<BaseOptions> {
    const submissionOptions = this.submissionOptionsRepository.create({
      submission,
      data: {},
    });

    return submissionOptions;
  }

  /**
   * Generates the form properties for a submission option.
   * Form properties are used for form generation in UI.
   *
   * @param {SubmissionOptionsModelRequestDto} requestModelDto
   * @return {*}  {Promise<FormBuilderMetadata<Record<string, Primitive>>>}
   */
  async generateSubmissionOptionsFormModel(
    requestModelDto: SubmissionOptionsModelRequestDto
  ): Promise<FormBuilderMetadata<Record<string, Primitive>>> {
    const account = await this.accountService.findOne(
      requestModelDto.accountId
    );

    const websiteInstance = this.websiteRegistry.findInstance(account);
    const model = this.getModel(requestModelDto.type, websiteInstance);

    // NOTE: typecast with primitive is technically unsafe.
    // Will cause issue if a defaultFrom points to a non-primitive (object) value.
    const form = formBuilder(
      model,
      websiteInstance.getWebsiteData() as Record<string, Primitive>
    );

    return form;
  }

  /**
   * Returns a model for the requested type on a website instance.
   * Throws when type/instance pairing can not be found.
   *
   * @param {SubmissionType} type
   * @param {UnknownWebsite} websiteInstance
   * @return {*}
   */
  private getModel(type: SubmissionType, websiteInstance: UnknownWebsite) {
    switch (type) {
      case SubmissionType.FILE: {
        if (isFileWebsite(websiteInstance)) {
          return websiteInstance.createFileModel();
        }

        throw new BadRequestException(
          `Website ${websiteInstance.metadata.name} does not support ${type}`
        );
      }

      case SubmissionType.MESSAGE: {
        if (isMessageWebsite(websiteInstance)) {
          return websiteInstance.createMessageModel();
        }

        throw new BadRequestException(
          `Website ${websiteInstance.metadata.name} does not support ${type}`
        );
      }

      default: {
        throw new BadRequestException(
          `Website ${websiteInstance.metadata.name} does not support ${type}`
        );
      }
    }
  }
}
