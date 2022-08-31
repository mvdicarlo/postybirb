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
import { v4 as uuid } from 'uuid';
import { AccountService } from '../../account/account.service';
import { Submission, SubmissionWebsiteOptions } from '../../database/entities/';
import { isFileWebsite } from '../../websites/models/website-modifiers/file-website';
import { isMessageWebsite } from '../../websites/models/website-modifiers/message-website';
import { UnknownWebsite } from '../../websites/website';
import { WebsiteRegistryService } from '../../websites/website-registry.service';
import { CreateSubmissionPartDto } from '../dtos/create-submission-part.dto';
import { SubmissionPartModelRequestDto } from '../dtos/submission-part-model-request.dto';
import { UpdateSubmissionPartDto } from '../dtos/update-submission-part.dto';
import SubmissionType from '../enums/submission-type';
import { IBaseSubmissionMetadata } from '../models/base-submission-metadata';
import { BaseWebsiteOptions } from '../models/base-website-options';
import { SubmissionMetadataType } from '../models/submission-metadata-types';

@Injectable()
export class SubmissionPartService {
  private readonly logger = Logger(SubmissionPartService.name);

  constructor(
    @InjectRepository(Submission)
    private readonly submissionRepository: EntityRepository<
      Submission<SubmissionMetadataType>
    >,
    @InjectRepository(Submission)
    private readonly submissionPartRepository: EntityRepository<
      SubmissionWebsiteOptions<BaseWebsiteOptions>
    >,
    private readonly websiteRegistry: WebsiteRegistryService,
    private readonly accountService: AccountService
  ) {}

  async create<T extends BaseWebsiteOptions>(
    createSubmissionPart: CreateSubmissionPartDto<T>
  ) {
    const account = await this.accountService.findAccount(
      createSubmissionPart.accountId
    );

    let submission: Submission<IBaseSubmissionMetadata>;
    try {
      submission = await this.submissionRepository.findOneOrFail(
        createSubmissionPart.submissionId
      );
    } catch {
      throw new NotFoundException(
        `Submission ${createSubmissionPart.submissionId} not found.`
      );
    }

    if (submission.parts.some((part) => part.account?.id === account.id)) {
      throw new BadRequestException(
        `Submission part with account id ${account.id} already exists on ${submission.id}. Use update operation instead.`
      );
    }

    const submissionPart = this.submissionPartRepository.create({
      submission,
      data: createSubmissionPart.data,
      account,
    });

    await this.submissionPartRepository.persistAndFlush(submissionPart);

    return submissionPart;
  }

  async findOne(
    id: string
  ): Promise<SubmissionWebsiteOptions<BaseWebsiteOptions>> {
    try {
      return await this.submissionPartRepository.findOneOrFail(id);
    } catch {
      throw new NotFoundException(id);
    }
  }

  /**
   * Deleted a submission part matching the Id provided.
   *
   * @param {string} id
   * @return {*}  {Promise<DeleteResult>}
   */
  @Log()
  async remove(id: string): Promise<void> {
    await this.submissionPartRepository.remove(await this.findOne(id));
  }

  /**
   * Updates a submission part matching the Id provided.
   *
   * @param {string} id
   * @param {UpdateSubmissionPartDto} updateSubmissionPartDto
   * @return {*}  {Promise<boolean>}
   */
  @Log()
  async update(
    updateSubmissionPartDto: UpdateSubmissionPartDto<BaseWebsiteOptions>
  ): Promise<boolean> {
    try {
      const options = await this.findOne(updateSubmissionPartDto.id);
      options.data = updateSubmissionPartDto.data;
      await this.submissionPartRepository.flush();

      return true;
    } catch (err) {
      throw new BadRequestException(err);
    }
  }

  /**
   * Creates the default submission part that stores shared data
   * across multiple submission parts.
   *
   * @param {Submission<IBaseSubmissionMetadata>} submission
   * @return {*}  {SubmissionPart<SafeObject>}
   */
  createDefaultSubmissionPart(
    submission: Submission<IBaseSubmissionMetadata>
  ): SubmissionWebsiteOptions<BaseWebsiteOptions> {
    const submissionPart = this.submissionPartRepository.create({
      id: uuid(),
      submission,
      data: {},
    });

    return submissionPart;
  }

  /**
   * Generates the form properties for a submission part.
   * Form properties are used for form generation in UI.
   *
   * @param {SubmissionPartModelRequestDto} requestModelDto
   * @return {*}  {Promise<FormBuilderMetadata<Record<string, Primitive>>>}
   */
  async generateSubmissionPartFormModel(
    requestModelDto: SubmissionPartModelRequestDto
  ): Promise<FormBuilderMetadata<Record<string, Primitive>>> {
    const account = await this.accountService.findAccount(
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
