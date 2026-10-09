import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubmissionId } from '@postybirb/types';
import {
    publishSubmissionProjectionChanged,
    publishSubmissionRemoved,
} from './submission.events';

@Injectable()
export class SubmissionEventPublisher {
  constructor(
    @Inject(EventEmitter2)
    private readonly eventEmitter: EventEmitter2,
  ) {}

  markChanged(
    ids: SubmissionId | SubmissionId[],
    immediate = false,
  ): void {
    publishSubmissionProjectionChanged(this.eventEmitter, ids, immediate);
  }

  markRemoved(ids: SubmissionId | SubmissionId[]): void {
    publishSubmissionRemoved(this.eventEmitter, ids);
  }
}
