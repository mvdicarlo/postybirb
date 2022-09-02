import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { Log, Logger } from '@postybirb/logger';
import { SUBMISSION_UPDATES } from '@postybirb/socket-events';
import { AccountService } from '../../account/account.service';
import { Submission } from '../../database/entities';
import { MulterFileInfo } from '../../file/models/multer-file-info';
import { WSGateway } from '../../web-socket/web-socket-gateway';
import { CreateSubmissionDto } from '../dtos/create-submission.dto';
import { SubmissionDto } from '../dtos/submission.dto';
import { UpdateSubmissionDto } from '../dtos/update-submission.dto';
import { ScheduleType } from '../enums/schedule-type';
import SubmissionType from '../enums/submission-type';
import { IBaseSubmissionMetadata } from '../models/base-submission-metadata';
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
    private readonly messageSubmissionService: MessageSubmissionService,
    @Optional() private readonly webSocket: WSGateway
  ) {}

  /**
   * Emits submissions onto websocket.
   */
  private async emit() {
    if (this.webSocket) {
      this.webSocket.emit({
        event: SUBMISSION_UPDATES,
        data: await this.findAllSubmissionDto(),
      });
    }
  }

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

    submission.options.add(
      await this.submissionOptionsService.createDefaultSubmissionOptions(
        submission
      )
    );
    await this.submissionRepository.persistAndFlush(submission);

    this.emit();
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
      return await this.submissionRepository.findOneOrFail(id, {
        populate: ['options', 'files'],
      });
    } catch (e) {
      this.logger.error(e);
      throw new NotFoundException(id);
    }
  }

  /**
   * Finds all submissions and returns their Dto.
   *
   * @return {*}  {Promise<
   *     SubmissionDto<IBaseSubmissionMetadata>[]
   *   >}
   */
  async findAllSubmissionDto(): Promise<
    SubmissionDto<IBaseSubmissionMetadata>[]
  > {
    const submissions = await this.submissionRepository.findAll({
      populate: ['options', 'files'],
    });
    return submissions.map(
      (s) => s.toJSON() as unknown as SubmissionDto<IBaseSubmissionMetadata>
    );
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
      })
      .finally(this.emit);
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
    this.emit();
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
      this.emit();
      return submission;
    }

    throw new BadRequestException('Submission is not a FILE submission.');
  }

  /**
   * Appends a thumbnail file to the associated fileId
   *
   * @param {string} id
   * @param {MulterFileInfo} file
   */
  async appendThumbnail(id: string, file: MulterFileInfo) {
    const submission = await this.findOne(id);

    if (isFileSubmission(submission)) {
      await this.fileSubmissionService.appendThumbnailFile(submission, file);
      await this.submissionRepository.persistAndFlush(submission);
      this.emit();
      return submission;
    }

    throw new BadRequestException('Submission is not a FILE submission.');
  }

  async replaceFile(id: string, fileId: string, file: MulterFileInfo) {
    const submission = await this.findOne(id);

    if (isFileSubmission(submission)) {
      await this.fileSubmissionService.replaceFile(submission, fileId, file);
      await this.submissionRepository.persistAndFlush(submission);
      this.emit();
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
      this.emit();
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
      await this.submissionRepository.persistAndFlush(submission);
      this.emit();
    }

    throw new BadRequestException('Submission is not a FILE submission.');
  }

  /** End of File Actions */
}
