import { Injectable } from '@nestjs/common';
import { CreateSubmissionDto } from '../dtos/create-submission.dto';
import { MessageSubmission } from '../models/message-submission.model';
import { ISubmissionService } from '../models/submission-service.interface';

@Injectable()
export class MessageSubmissionService
  implements ISubmissionService<MessageSubmission>
{
  async populate(
    submission: MessageSubmission,
    createSubmissionDto: CreateSubmissionDto
  ): Promise<void> {
    // Do nothing for now
    return;
  }
}
