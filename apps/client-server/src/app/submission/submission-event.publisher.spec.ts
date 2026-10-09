import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubmissionEventPublisher } from './submission-event.publisher';
import {
    SUBMISSION_PROJECTION_CHANGED,
    SUBMISSION_REMOVED,
    SubmissionProjectionChangedEvent,
    SubmissionRemovedEvent,
} from './submission.events';

describe('SubmissionEventPublisher', () => {
  const emit = jest.fn();
  let publisher: SubmissionEventPublisher;

  beforeEach(() => {
    emit.mockReset();
    publisher = new SubmissionEventPublisher({
      emit,
    } as unknown as EventEmitter2);
  });

  it('publishes changed IDs with duplicates removed', () => {
    publisher.markChanged(['first', 'first', 'second']);

    expect(emit).toHaveBeenCalledWith(SUBMISSION_PROJECTION_CHANGED, [
      new SubmissionProjectionChangedEvent(['first', 'second']),
    ]);
  });

  it('forwards immediate changed publication', () => {
    publisher.markChanged('first', true);

    expect(emit).toHaveBeenCalledWith(SUBMISSION_PROJECTION_CHANGED, [
      new SubmissionProjectionChangedEvent(['first'], true),
    ]);
  });

  it('publishes removed IDs immediately with duplicates removed', () => {
    publisher.markRemoved(['first', 'first', 'second']);

    expect(emit).toHaveBeenCalledWith(SUBMISSION_REMOVED, [
      new SubmissionRemovedEvent(['first', 'second']),
    ]);
  });
});
