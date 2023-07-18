import { Injectable } from '@nestjs/common';
import { MessageSubmission } from '@postybirb/types';
import { CreateSubmissionDto } from '../dtos/create-submission.dto';
import { ISubmissionService } from './submission-service.interface';

@Injectable()
export class MessageSubmissionService
  implements ISubmissionService<MessageSubmission>
{
  async populate(
    submission: MessageSubmission,
    createSubmissionDto: CreateSubmissionDto
  ): Promise<void> {
    // Do nothing for now
  }
}
