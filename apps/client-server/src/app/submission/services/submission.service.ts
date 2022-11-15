import { EntityRepository, FindOptions } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Log } from '@postybirb/logger';
import { SUBMISSION_UPDATES } from '@postybirb/socket-events';
import {
  FileSubmission,
  IBaseSubmissionMetadata,
  isFileSubmission,
  MessageSubmission,
  ScheduleType,
  SubmissionMetadataType,
  SubmissionType,
} from '@postybirb/types';
import { Constructor } from 'type-fest';
import { AccountService } from '../../account/account.service';
import { OnDatabaseQuery } from '../../common/service/modifiers/on-database-query';
import { OnDatabaseUpdate } from '../../common/service/modifiers/on-database-update';
import { PostyBirbCRUDService } from '../../common/service/postybirb-crud-service';
import { Submission } from '../../database/entities';
import { BaseEntity } from '../../database/entities/base.entity';
import { MulterFileInfo } from '../../file/models/multer-file-info';
import { WSGateway } from '../../web-socket/web-socket-gateway';
import { CreateSubmissionDto } from '../dtos/create-submission.dto';
import { SubmissionDto } from '../dtos/submission.dto';
import { UpdateSubmissionDto } from '../dtos/update-submission.dto';
import { FileSubmissionService } from './file-submission.service';
import { MessageSubmissionService } from './message-submission.service';
import { SubmissionOptionsService } from './submission-options.service';

type SubmissionEntity = Submission<SubmissionMetadataType>;

/**
 * Service that handles the vast majority of submission management logic.
 *
 * @class SubmissionService
 */
@Injectable()
export class SubmissionService
  extends PostyBirbCRUDService<SubmissionEntity>
  implements OnDatabaseQuery<SubmissionEntity>, OnDatabaseUpdate
{
  constructor(
    moduleRef: ModuleRef,
    @InjectRepository(Submission)
    repository: EntityRepository<SubmissionEntity>,
    private readonly accountService: AccountService,
    @Inject(forwardRef(() => SubmissionOptionsService))
    private readonly submissionOptionsService: SubmissionOptionsService,
    private readonly fileSubmissionService: FileSubmissionService,
    private readonly messageSubmissionService: MessageSubmissionService,
    @Optional() webSocket: WSGateway
  ) {
    super(moduleRef, repository, webSocket);
  }

  getRegisteredEntities(): Constructor<BaseEntity>[] {
    return [Submission];
  }

  onDatabaseUpdate() {
    this.emit();
  }

  getDefaultQueryOptions(): FindOptions<SubmissionEntity, 'options' | 'files'> {
    return {
      populate: ['options', 'files'],
    };
  }

  /**
   * Emits submissions onto websocket.
   */
  public async emit() {
    super.emit({
      event: SUBMISSION_UPDATES,
      data: await this.findAllAsDto<SubmissionDto<IBaseSubmissionMetadata>>(
        SubmissionDto
      ),
    });
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
  ): Promise<SubmissionEntity> {
    const submission = this.repository.create({
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

    let name = 'New submission';
    if (createSubmissionDto.name) {
      name = createSubmissionDto.name;
    } else if (file) {
      name = file.filename;
    }

    submission.options.add(
      await this.submissionOptionsService.createDefaultSubmissionOptions(
        submission,
        name
      )
    );

    await this.repository.persistAndFlush(submission);
    return submission;
  }

  /**
   * Update a Submission matching the Id provided.
   *
   * @param {string} id
   * @param {UpdateSubmissionDto} updateSubmissionDto
   * @return {*}  {Promise<boolean>}
   */
  async update(updateSubmissionDto: UpdateSubmissionDto): Promise<boolean> {
    const submission = await this.findOne(updateSubmissionDto.id);

    submission.isScheduled = updateSubmissionDto.isScheduled;
    submission.schedule = {
      scheduledFor: updateSubmissionDto.scheduledFor,
      scheduleType: updateSubmissionDto.scheduleType,
    };

    return this.repository
      .flush()
      .then(() => true)
      .catch((err) => {
        throw new BadRequestException(err);
      });
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
      await this.repository.persistAndFlush(submission);
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
      await this.repository.persistAndFlush(submission);
      return submission;
    }

    throw new BadRequestException('Submission is not a FILE submission.');
  }

  async replaceFile(id: string, fileId: string, file: MulterFileInfo) {
    const submission = await this.findOne(id);

    if (isFileSubmission(submission)) {
      await this.fileSubmissionService.replaceFile(submission, fileId, file);
      await this.repository.persistAndFlush(submission);
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
      await this.repository.persistAndFlush(submission);
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
      await this.repository.persistAndFlush(submission);
    }

    throw new BadRequestException('Submission is not a FILE submission.');
  }

  /** End of File Actions */
}
