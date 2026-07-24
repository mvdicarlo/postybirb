/* eslint-disable max-classes-per-file */
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SUBMISSION_DELTA } from '@postybirb/socket-events';
import {
    EntityDelta,
    ISubmissionDto,
    ISubmissionMetadata,
    SubmissionId,
} from '@postybirb/types';
import { WebsocketEvent } from '../web-socket/models/web-socket-event';

export const SUBMISSION_PROJECTION_CHANGED = 'submission.projection-changed';

export const SUBMISSION_REMOVED = 'submission.removed';

export class SubmissionProjectionChangedEvent {
  constructor(
    public readonly submissionIds: SubmissionId[],
    public readonly immediate = false,
  ) {}
}

export class SubmissionRemovedEvent {
  constructor(public readonly submissionIds: SubmissionId[]) {}
}

function uniqueIds(ids: SubmissionId | SubmissionId[]): SubmissionId[] {
  return [...new Set(Array.isArray(ids) ? ids : [ids])];
}

export function publishSubmissionProjectionChanged(
  eventEmitter: EventEmitter2 | undefined,
  ids: SubmissionId | SubmissionId[],
  immediate = false,
): void {
  const submissionIds = uniqueIds(ids);
  if (submissionIds.length) {
    eventEmitter?.emit(SUBMISSION_PROJECTION_CHANGED, [
      new SubmissionProjectionChangedEvent(submissionIds, immediate),
    ]);
  }
}

export function publishSubmissionRemoved(
  eventEmitter: EventEmitter2 | undefined,
  ids: SubmissionId | SubmissionId[],
): void {
  const submissionIds = uniqueIds(ids);
  if (submissionIds.length) {
    eventEmitter?.emit(SUBMISSION_REMOVED, [
      new SubmissionRemovedEvent(submissionIds),
    ]);
  }
}

export type SubmissionEventTypes = SubmissionDeltaEvent;

class SubmissionDeltaEvent
  implements WebsocketEvent<EntityDelta<ISubmissionDto<ISubmissionMetadata>>>
{
  event: string = SUBMISSION_DELTA;

  data: EntityDelta<ISubmissionDto<ISubmissionMetadata>>;
}
