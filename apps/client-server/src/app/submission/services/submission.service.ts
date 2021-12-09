import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Log, Logger } from '@postybirb/logger';
import { Express } from 'express';
import 'multer';
import { DeleteResult, Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { AccountService } from '../../account/account.service';
import { SUBMISSION_REPOSITORY } from '../../constants';
import { SafeObject } from '../../shared/types/safe-object.type';
import { CreateSubmissionDto } from '../dtos/create-submission.dto';
import { Submission } from '../entities/submission.entity';
import { ScheduleType } from '../enums/schedule-type.enum';
import SubmissionType from '../enums/submission-type.enum';
import { SubmissionPartService } from './submission-part.service';

@Injectable()
export class SubmissionService {
  private readonly logger = Logger(SubmissionService.name);

  constructor(
    @Inject(SUBMISSION_REPOSITORY)
    private readonly submissionRepository: Repository<Submission<SafeObject>>,
    private readonly accountService: AccountService,
    private readonly submissionPartService: SubmissionPartService
  ) {}

  @Log()
  async create(
    createSubmissionDto: CreateSubmissionDto,
    file?: Express.Multer.File
  ): Promise<Submission<SafeObject>> {
    const submission = this.submissionRepository.create({
      id: uuid(),
      ...createSubmissionDto,
      isScheduled: false,
      schedule: {
        scheduledFor: undefined,
        scheduleType: ScheduleType.SINGLE,
      },
      parts: [],
      metadata: {},
    });

    switch (createSubmissionDto.type) {
      case SubmissionType.MESSAGE: {
        // TODO
        break;
      }

      case SubmissionType.FILE: {
        if (!file) {
          throw new BadRequestException(
            'No file provided for SubmissionType FILE.'
          );
        }

        // TODO
        break;
      }

      default: {
        throw new BadRequestException(
          `Unknown SubmissionType: ${createSubmissionDto.type}.`
        );
      }
    }

    submission.parts.push(
      this.submissionPartService.createDefaultSubmissionPart(submission)
    );

    return await this.submissionRepository.save(submission);
  }

  /**
   * Find a Submission matching the Id provided.
   *
   * @param {string} id
   * @return {*}  {Promise<Submission<SafeObject>>}
   */
  async findOne(id: string): Promise<Submission<SafeObject>> {
    try {
      return await this.submissionRepository.findOneOrFail(id);
    } catch (e) {
      this.logger.error(e);
      throw new NotFoundException(id);
    }
  }

  /**
   * Deleted a Submission matching the Id provided.
   *
   * @param {string} id
   * @return {*}  {Promise<DeleteResult>}
   */
  @Log()
  async remove(id: string): Promise<DeleteResult> {
    await this.findOne(id);
    return await this.submissionRepository.delete(id).then((result) => {
      return result;
    });
  }
}
