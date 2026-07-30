import {
    CanActivate,
    ConflictException,
    ExecutionContext,
    Injectable,
} from '@nestjs/common';
import { SubmissionId } from '@postybirb/types';
import { PostingLockService } from '../../posting-lock/posting-lock.service';

/**
 * Refuses mutations to a submission that is currently being posted.
 *
 * Only usable on routes that carry the submission id as `:id` — routes keyed by
 * file id would need an async lookup and are gated in the UI instead.
 */
@Injectable()
export class NotWhilePostingGuard implements CanActivate {
  constructor(private readonly postingLock: PostingLockService) {}

  canActivate(context: ExecutionContext): boolean {
    const { params } = context.switchToHttp().getRequest();
    const submissionId: SubmissionId | undefined = params?.id;

    if (submissionId && this.postingLock.isPostingLocked(submissionId)) {
      throw new ConflictException(
        'This submission is being posted and its files cannot be changed until it finishes.',
      );
    }

    return true;
  }
}
