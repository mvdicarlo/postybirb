import { CreateSubmissionDto, MessageSubmission } from '@postybirb/types';
import { Injectable } from '@nestjs/common';

import { ISubmissionService } from './submission-service.interface';

@Injectable()
export class MessageSubmissionService implements ISubmissionService<MessageSubmission> {
  async populate(
    submission: MessageSubmission,
    createSubmissionDto: CreateSubmissionDto,
  ): Promise<void> {
    // Do nothing for now
  }
}
