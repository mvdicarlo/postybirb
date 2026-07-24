import {
    Injectable,
    OnModuleDestroy,
    Optional,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Logger } from '@postybirb/logger';
import { SUBMISSION_DELTA } from '@postybirb/socket-events';
import { ISubmissionDto, SubmissionId } from '@postybirb/types';
import { WSGateway } from '../web-socket/web-socket-gateway';
import { WebSocketEvents } from '../web-socket/web-socket.events';
import { SubmissionService } from './services/submission.service';
import {
    SUBMISSION_PROJECTION_CHANGED,
    SUBMISSION_REMOVED,
    SubmissionProjectionChangedEvent,
    SubmissionRemovedEvent,
} from './submission.events';

const PROJECTION_DEBOUNCE_MS = 50;

type ProjectionIntent = 'changed' | 'removed';

type PendingProjection = {
  intent: ProjectionIntent;
  revision: number;
  attempts: number;
};

@Injectable()
export class SubmissionEventListener implements OnModuleDestroy {
  private readonly logger = Logger(SubmissionEventListener.name);

  private readonly revisions = new Map<SubmissionId, number>();

  private readonly pending = new Map<SubmissionId, PendingProjection>();

  private debounceTimer?: ReturnType<typeof setTimeout>;

  private processing = false;

  private immediateDrainPending = false;

  @OnEvent(SUBMISSION_PROJECTION_CHANGED)
  private submissionChanged(
    events: SubmissionProjectionChangedEvent[],
  ): void {
    events.forEach((event) =>
      this.queue(event.submissionIds, 'changed', event.immediate),
    );
  }

  @OnEvent(SUBMISSION_REMOVED)
  private submissionRemoved(events: SubmissionRemovedEvent[]): void {
    events.forEach((event) => this.queue(event.submissionIds, 'removed'));
  }

  constructor(
    private readonly submissionService: SubmissionService,
    @Optional() private readonly webSocket?: WSGateway,
  ) {}

  onModuleDestroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }
    this.pending.clear();
    this.revisions.clear();
  }

  private queue(
    ids: SubmissionId[],
    intent: ProjectionIntent,
    immediate = false,
  ): void {
    [...new Set(ids)].forEach((id) => {
      const revision = (this.revisions.get(id) ?? 0) + 1;
      this.revisions.set(id, revision);
      this.pending.set(id, { intent, revision, attempts: 0 });
    });
    this.immediateDrainPending ||= immediate;
    this.scheduleDrain();
  }

  private scheduleDrain(): void {
    if (this.processing || !this.pending.size) {
      return;
    }

    if (this.immediateDrainPending) {
      this.immediateDrainPending = false;
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = undefined;
      }
      this.drain().catch((error) => {
        this.logger.withError(error).error('Failed to drain Submission events');
      });
      return;
    }

    if (this.debounceTimer) {
      return;
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = undefined;
      this.drain().catch((error) => {
        this.logger.withError(error).error('Failed to drain Submission events');
      });
    }, PROJECTION_DEBOUNCE_MS);
  }

  private async drain(): Promise<void> {
    if (this.processing || !this.pending.size) {
      return;
    }

    this.processing = true;
    const batch = new Map(this.pending);
    this.pending.clear();

    try {
      const changedIds = [...batch.entries()].flatMap(([id, pending]) =>
        pending.intent === 'changed' ? [id] : [],
      );
      const dtos = await this.submissionService.findByIdsAsDto(changedIds);

      const dtosById = new Map(dtos.map((dto) => [dto.id, dto]));
      const upserts: ISubmissionDto[] = [];
      const removedIds: SubmissionId[] = [];
      batch.forEach((pending, id) => {
        if (this.revisions.get(id) !== pending.revision) {
          return;
        }
        if (pending.intent === 'removed') {
          removedIds.push(id);
          return;
        }
        const dto = dtosById.get(id);
        if (dto) {
          upserts.push(dto);
        } else {
          removedIds.push(id);
        }
      });

      if (upserts.length || removedIds.length) {
        this.webSocket?.emit({
          event: SUBMISSION_DELTA,
          data: { upserts, removedIds },
        } as WebSocketEvents);
      }
    } catch (error) {
      this.logger
        .withError(error)
        .error('Failed to build Submission projection delta');
      batch.forEach((pending, id) => {
        if (
          pending.attempts < 1 &&
          this.revisions.get(id) === pending.revision &&
          !this.pending.has(id)
        ) {
          this.pending.set(id, {
            ...pending,
            attempts: pending.attempts + 1,
          });
        }
      });
    } finally {
      this.processing = false;
      batch.forEach((pending, id) => {
        if (
          this.revisions.get(id) === pending.revision &&
          !this.pending.has(id)
        ) {
          this.revisions.delete(id);
        }
      });
      this.scheduleDrain();
    }
  }
}
