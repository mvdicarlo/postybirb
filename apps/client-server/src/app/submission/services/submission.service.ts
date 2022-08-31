import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Log, Logger } from '@postybirb/logger';
import { v4 as uuid } from 'uuid';
import { AccountService } from '../../account/account.service';
import { Submission } from '../../database/entities';
import { MulterFileInfo } from '../../file/models/multer-file-info';
import { CreateSubmissionDto } from '../dtos/create-submission.dto';
import { UpdateSubmissionDto } from '../dtos/update-submission.dto';
import { ScheduleType } from '../enums/schedule-type';
import SubmissionType from '../enums/submission-type';
import { FileSubmission, isFileSubmission } from '../models/file-submission';
import { MessageSubmission } from '../models/message-submission';
import { SubmissionMetadataType } from '../models/submission-metadata-types';
import { FileSubmissionService } from './file-submission.service';
import { MessageSubmissionService } from './message-submission.service';
import { SubmissionOptionsService } from './submission-options.service';

/**
 * Service that handles the vast majority of submission management logic.
 *
 * @class SubmissionService
 */
@Injectable()
export class SubmissionService {
  private readonly logger = Logger(SubmissionService.name);

  constructor(
    @InjectRepository(Submission)
    private readonly submissionRepository: EntityRepository<
      Submission<SubmissionMetadataType>
    >,
    private readonly accountService: AccountService,
    private readonly submissionOptionsService: SubmissionOptionsService,
    private readonly fileSubmissionService: FileSubmissionService,
    private readonly messageSubmissionService: MessageSubmissionService
  ) {}

  /**
   * Creates a submission.
   * @todo need to make transactional
   *
   * @param {CreateSubmissionDto} createSubmissionDto
   * @param {MulterFileInfo} [file]
   * @return {*}  {Promise<Submission<SubmissionMetadataType>>}
   */
  @Log()
  async create(
    createSubmissionDto: CreateSubmissionDto,
    file?: MulterFileInfo
  ): Promise<Submission<SubmissionMetadataType>> {
    const submission = this.submissionRepository.create({
      id: uuid(),
      ...createSubmissionDto,
      isScheduled: false,
      schedule: {
        scheduledFor: undefined,
        scheduleType: ScheduleType.SINGLE,
      },
      options: [],
      metadata: {},
    });

    switch (createSubmissionDto.type) {
      case SubmissionType.MESSAGE: {
        if (file) {
          throw new BadRequestException(
            'A file was provided for SubmissionType Message.'
          );
        }

        await this.messageSubmissionService.populate(
          submission as MessageSubmission,
          createSubmissionDto
        );
        break;
      }

      case SubmissionType.FILE: {
        if (!file) {
          throw new BadRequestException(
            'No file provided for SubmissionType FILE.'
          );
        }

        await this.fileSubmissionService.populate(
          submission as FileSubmission,
          createSubmissionDto,
          file
        );
        break;
      }

      default: {
        throw new BadRequestException(
          `Unknown SubmissionType: ${createSubmissionDto.type}.`
        );
      }
    }

    submission.options.push(
      this.submissionOptionsService.createDefaultSubmissionOptions(submission)
    );

    await this.submissionRepository.persistAndFlush(submission);

    return submission;
  }

  /**
   * Find a Submission matching the Id provided.
   *
   * @param {string} id
   * @return {*}  {Promise<Submission<SubmissionMetadataType>>}
   */
  async findOne(id: string): Promise<Submission<SubmissionMetadataType>> {
    try {
      return await this.submissionRepository.findOneOrFail(id);
    } catch (e) {
      this.logger.error(e);
      throw new NotFoundException(id);
    }
  }

  /**
   * Update a Submission matching the Id provided.
   *
   * @param {string} id
   * @param {UpdateSubmissionDto} updateSubmissionDto
   * @return {*}  {Promise<boolean>}
   */
  async update(
    id: string,
    updateSubmissionDto: UpdateSubmissionDto
  ): Promise<boolean> {
    const submission = await this.findOne(id);

    submission.isScheduled = updateSubmissionDto.isScheduled;
    submission.schedule = {
      scheduledFor: updateSubmissionDto.scheduledFor,
      scheduleType: updateSubmissionDto.scheduleType,
    };

    return this.submissionRepository
      .flush()
      .then(() => true)
      .catch((err) => {
        throw new BadRequestException(err);
      });
  }

  /**
   * Deleted a Submission matching the Id provided.
   *
   * @param {string} id
   * @return {*}  {Promise<DeleteResult>}
   */
  @Log()
  async remove(id: string): Promise<void> {
    await this.submissionRepository.remove(await this.findOne(id));
  }

  /** File Actions */

  /**
   * Adds a file to a submission.
   *
   * @param {string} id
   * @param {MulterFileInfo} file
   */
  async appendFile(id: string, file: MulterFileInfo) {
    const submission = await this.findOne(id);

    if (isFileSubmission(submission)) {
      await this.fileSubmissionService.appendFile(submission, file);
      await this.submissionRepository.persistAndFlush(submission);
      return submission;
    }

    throw new BadRequestException('Submission is not a FILE submission.');
  }

  /**
   * Appends a thumbnail file to the associated fileId
   *
   * @param {string} id
   * @param {string} fileId
   * @param {MulterFileInfo} file
   */
  async appendThumbnail(id: string, fileId: string, file: MulterFileInfo) {
    const submission = await this.findOne(id);

    if (isFileSubmission(submission)) {
      await this.fileSubmissionService.appendThumbnailFile(
        submission,
        fileId,
        file
      );
      await this.submissionRepository.persistAndFlush(submission);
      return submission;
    }

    throw new BadRequestException('Submission is not a FILE submission.');
  }

  async replaceFile(id: string, fileId: string, file: MulterFileInfo) {
    const submission = await this.findOne(id);

    if (isFileSubmission(submission)) {
      await this.fileSubmissionService.replaceFile(submission, fileId, file);
      await this.submissionRepository.persistAndFlush(submission);
      return submission;
    }

    throw new BadRequestException('Submission is not a FILE submission.');
  }

  /**
   * Replaces a thumbnail file.
   *
   * @param {string} id
   * @param {string} fileId
   * @param {MulterFileInfo} file
   */
  async replaceThumbnail(id: string, fileId: string, file: MulterFileInfo) {
    const submission = await this.findOne(id);

    if (isFileSubmission(submission)) {
      await this.fileSubmissionService.replaceThumbnailFile(
        submission,
        fileId,
        file
      );
      await this.submissionRepository.persistAndFlush(submission);
      return submission;
    }

    throw new BadRequestException('Submission is not a FILE submission.');
  }

  /**
   * Removes a file of thumbnail that matches file id.
   *
   * @param {string} id
   * @param {string} fileId
   */
  async removeFile(id: string, fileId: string) {
    const submission = await this.findOne(id);

    if (isFileSubmission(submission)) {
      await this.fileSubmissionService.removeFile(submission, fileId);
      this.submissionRepository.persistAndFlush(submission);
    }

    throw new BadRequestException('Submission is not a FILE submission.');
  }

  /** End of File Actions */
}
