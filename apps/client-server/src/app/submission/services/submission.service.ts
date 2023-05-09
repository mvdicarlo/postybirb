import { FindOptions } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  Inject,
  Injectable,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { Log } from '@postybirb/logger';
import { SUBMISSION_UPDATES } from '@postybirb/socket-events';
import {
  FileSubmission,
  MessageSubmission,
  ScheduleType,
  SubmissionMetadataType,
  SubmissionType,
  isFileSubmission,
} from '@postybirb/types';
import { AccountService } from '../../account/account.service';
import { OnDatabaseQuery } from '../../common/service/modifiers/on-database-query';
import { PostyBirbService } from '../../common/service/postybirb-service';
import { Submission } from '../../database/entities';
import { PostyBirbRepository } from '../../database/repositories/postybirb-repository';
import { DatabaseUpdateSubscriber } from '../../database/subscribers/database.subscriber';
import { MulterFileInfo } from '../../file/models/multer-file-info';
import { SubmissionOptionsService } from '../../submission-options/submission-options.service';
import { WSGateway } from '../../web-socket/web-socket-gateway';
import { CreateSubmissionDto } from '../dtos/create-submission.dto';
import { UpdateSubmissionDto } from '../dtos/update-submission.dto';
import { FileSubmissionService } from './file-submission.service';
import { MessageSubmissionService } from './message-submission.service';

type SubmissionEntity = Submission<SubmissionMetadataType>;

/**
 * Service that handles the vast majority of submission management logic.
 *
 * @class SubmissionService
 */
@Injectable()
export class SubmissionService
  extends PostyBirbService<SubmissionEntity>
  implements OnDatabaseQuery<Submission>
{
  constructor(
    dbSubscriber: DatabaseUpdateSubscriber,
    @InjectRepository(Submission)
    repository: PostyBirbRepository<SubmissionEntity>,
    private readonly accountService: AccountService,
    @Inject(forwardRef(() => SubmissionOptionsService))
    private readonly submissionOptionsService: SubmissionOptionsService,
    private readonly fileSubmissionService: FileSubmissionService,
    private readonly messageSubmissionService: MessageSubmissionService,
    @Optional() webSocket: WSGateway
  ) {
    super(repository, webSocket);
    repository.addUpdateListener(dbSubscriber, [Submission], () => this.emit());
  }

  getDefaultQueryOptions(): FindOptions<Submission, 'options' | 'files'> {
    return {
      // Typechecking is annoying here for nested types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      populate: ['options', 'files', 'options.account' as any],
    };
  }

  /**
   * Emits submissions onto websocket.
   */
  public async emit() {
    super.emit({
      event: SUBMISSION_UPDATES,
      data: (await this.repository.findAll(this.getDefaultQueryOptions())).map(
        (s) => s.toJSON()
      ),
    });
  }

  public findOne(id: string) {
    return this.repository.findOneOrFail(id, this.getDefaultQueryOptions());
  }

  remove(id: string) {
    this.logger.info({}, `Removing Submission '${id}'`);
    return this.repository.delete(id);
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
    const submission = await this.repository.findOne(
      updateSubmissionDto.id,
      this.getDefaultQueryOptions()
    );

    submission.isScheduled = updateSubmissionDto.isScheduled;
    submission.schedule = {
      scheduledFor: updateSubmissionDto.scheduledFor,
      scheduleType: updateSubmissionDto.scheduleType,
    };
    submission.metadata = {
      ...submission.metadata,
      ...updateSubmissionDto.metadata,
    };

    const optionChanges: Promise<unknown>[] = [];
    if (updateSubmissionDto.deletedOptions?.length) {
      updateSubmissionDto.deletedOptions.forEach((deletedOption) => {
        optionChanges.push(
          this.submissionOptionsService.remove(deletedOption.id)
        );
      });
    }

    if (updateSubmissionDto.newOrUpdatedOptions?.length) {
      updateSubmissionDto.newOrUpdatedOptions.forEach((option) => {
        if (option.createdAt) {
          optionChanges.push(
            this.submissionOptionsService.update({
              id: option.id,
              data: option.data,
            })
          );
        } else {
          optionChanges.push(
            this.submissionOptionsService.create({
              accountId: option.account.id,
              data: option.data,
              submissionId: submission.id,
            })
          );
        }
      });
    }

    await Promise.allSettled(optionChanges);

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
    const submission = await this.repository.findById(id, {
      failOnMissing: true,
    });

    if (isFileSubmission(submission)) {
      await this.fileSubmissionService.appendFile(submission, file);
      await this.repository.persistAndFlush(submission);
      return submission;
    }

    throw new BadRequestException('Submission is not a FILE submission.');
  }

  async replaceFile(id: string, fileId: string, file: MulterFileInfo) {
    const submission = await this.repository.findById(id);

    if (isFileSubmission(submission)) {
      await this.fileSubmissionService.replaceFile(submission, fileId, file);
      await this.repository.persistAndFlush(submission);
      return;
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
    const submission = await this.repository.findById(id);

    if (isFileSubmission(submission)) {
      await this.fileSubmissionService.replaceThumbnailFile(fileId, file);
      await this.repository.persistAndFlush(submission);
      return;
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
    const submission = await this.repository.findById(id);

    if (isFileSubmission(submission)) {
      await this.fileSubmissionService.removeFile(submission, fileId);
      await this.repository.persistAndFlush(submission);
    } else {
      throw new BadRequestException('Submission is not a FILE submission.');
    }
  }

  /** End of File Actions */
}
