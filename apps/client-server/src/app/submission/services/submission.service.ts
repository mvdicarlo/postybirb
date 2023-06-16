import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  Inject,
  Injectable,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { SUBMISSION_UPDATES } from '@postybirb/socket-events';
import {
  FileSubmission,
  MessageSubmission,
  ScheduleType,
  SubmissionMetadataType,
  SubmissionType,
} from '@postybirb/types';
import { PostyBirbService } from '../../common/service/postybirb-service';
import { Submission } from '../../database/entities';
import { PostyBirbRepository } from '../../database/repositories/postybirb-repository';
import { DatabaseUpdateSubscriber } from '../../database/subscribers/database.subscriber';
import { MulterFileInfo } from '../../file/models/multer-file-info';
import { WSGateway } from '../../web-socket/web-socket-gateway';
import { WebsiteOptionsService } from '../../website-options/website-options.service';
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
export class SubmissionService extends PostyBirbService<SubmissionEntity> {
  constructor(
    dbSubscriber: DatabaseUpdateSubscriber,
    @InjectRepository(Submission)
    repository: PostyBirbRepository<SubmissionEntity>,
    @Inject(forwardRef(() => WebsiteOptionsService))
    private readonly submissionOptionsService: WebsiteOptionsService,
    private readonly fileSubmissionService: FileSubmissionService,
    private readonly messageSubmissionService: MessageSubmissionService,
    @Optional() webSocket: WSGateway
  ) {
    super(repository, webSocket);
    repository.addUpdateListener(dbSubscriber, [Submission], () => this.emit());
  }

  /**
   * Emits submissions onto websocket.
   */
  public async emit() {
    super.emit({
      event: SUBMISSION_UPDATES,
      data: (await this.repository.findAll()).map((s) => s.toJSON()),
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

  async update(id: string, update: UpdateSubmissionDto) {
    this.logger.info(update, `Updating Submission '${id}`);
    const submission = await this.findById(id, { failOnMissing: true });

    submission.isScheduled = update.isScheduled;
    submission.schedule = {
      scheduledFor: update.scheduledFor,
      scheduleType: update.scheduleType,
    };
    submission.metadata = {
      ...submission.metadata,
      ...update.metadata,
    };

    const optionChanges: Promise<unknown>[] = [];

    // Removes unused website options
    if (update.deletedWebsiteOptions?.length) {
      update.deletedWebsiteOptions.forEach((deletedOptionId) => {
        optionChanges.push(
          this.submissionOptionsService.remove(deletedOptionId)
        );
      });
    }

    // Creates or updates new website options
    if (update.newOrUpdatedOptions?.length) {
      update.newOrUpdatedOptions.forEach((option) => {
        if (option.createdAt) {
          optionChanges.push(
            this.submissionOptionsService.update(option.id, {
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

    try {
      await this.repository.flush();
      return await this.findById(id);
    } catch (err) {
      throw new BadRequestException(err);
    }
  }
}
