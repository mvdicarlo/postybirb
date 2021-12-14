import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import { Repository } from 'typeorm';
import { SUBMISSION_PART_REPOSITORY } from '../../constants';
import { SafeObject } from '../../shared/types/safe-object.type';
import { SubmissionPart } from '../entities/submission-part.entity';
import { Submission } from '../entities/submission.entity';
import { v4 as uuid } from 'uuid';
import { IBaseSubmissionMetadata } from '../models/base-submission-metadata.model';

@Injectable()
export class SubmissionPartService {
  private readonly logger = Logger(SubmissionPartService.name);

  constructor(
    @Inject(SUBMISSION_PART_REPOSITORY)
    private readonly submissionRepository: Repository<
      SubmissionPart<SafeObject>
    >
  ) {}

  createDefaultSubmissionPart(
    submission: Submission<IBaseSubmissionMetadata>
  ): SubmissionPart<SafeObject> {
    const submissionPart = this.submissionRepository.create({
      id: uuid(),
      submission,
      data: {},
    });

    return submissionPart;
  }
}
