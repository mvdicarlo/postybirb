import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  AccountSchema,
  getDatabase,
  PostEventSchema,
  PostRecordSchema,
  PostSchema,
  Select,
  SubmissionFileSchema,
  UnitOfWorkSchema,
} from '@postybirb/database';
import { Logger, PostyBirbLogger } from '@postybirb/logger';
import { PostEventType, UnitOfWorkState } from '@postybirb/types';
import { IsTestEnvironment } from '@postybirb/utils/common';
import {
  and,
  asc,
  count,
  eq,
  inArray,
  isNotNull,
  notExists,
} from 'drizzle-orm';
import { chunk } from 'lodash';
import { v4 as uuid } from 'uuid';

type LegacyPostRecord = Select<'PostRecordSchema'>;
type LegacyPostEvent = Select<'PostEventSchema'>;
type MigratedUnit = Select<'UnitOfWorkSchema'> & { targetKey: string };

const MIGRATION_BATCH_SIZE = 250;

const OUTCOME_EVENT_TYPES = new Set<PostEventType>([
  PostEventType.FILE_POSTED,
  PostEventType.FILE_FAILED,
  PostEventType.MESSAGE_POSTED,
  PostEventType.MESSAGE_FAILED,
]);

const SUCCESS_EVENT_TYPES = new Set<PostEventType>([
  PostEventType.FILE_POSTED,
  PostEventType.MESSAGE_POSTED,
  PostEventType.POST_ATTEMPT_COMPLETED,
]);

export interface LegacyPostHistoryMigrationStats {
  submissionsScanned: number;
  postsCreated: number;
  unitsCreated: number;
  submissionsSkipped: number;
  submissionsFailed: number;
  recordsSkipped: number;
  eventsSkipped: number;
}

@Injectable()
export class LegacyPostHistoryMigrationService implements OnModuleInit {
  private readonly logger: PostyBirbLogger = Logger(
    LegacyPostHistoryMigrationService.name,
  );

  public async onModuleInit(): Promise<void> {
    if (IsTestEnvironment()) {
      return;
    }

    const stats = await this.migrate();
    if (stats.submissionsScanned > 0) {
      this.logger
        .withMetadata(stats)
        .info('Legacy post history migration complete');
    }
  }

  public async migrate(): Promise<LegacyPostHistoryMigrationStats> {
    const db = getDatabase();
    const history = await db
      .select({
        submissionId: PostRecordSchema.submissionId,
        postId: PostSchema.id,
        recordCount: count(),
      })
      .from(PostRecordSchema)
      .leftJoin(
        PostSchema,
        eq(PostSchema.submissionId, PostRecordSchema.submissionId),
      )
      .groupBy(PostRecordSchema.submissionId, PostSchema.id);
    const stats: LegacyPostHistoryMigrationStats = {
      submissionsScanned: 0,
      postsCreated: 0,
      unitsCreated: 0,
      submissionsSkipped: 0,
      submissionsFailed: 0,
      recordsSkipped: 0,
      eventsSkipped: 0,
    };

    for (const group of history) {
      if (group.submissionId === null) {
        stats.recordsSkipped += group.recordCount;
      } else {
        stats.submissionsScanned += 1;
        if (group.postId !== null) {
          stats.submissionsSkipped += 1;
        }
      }
    }

    if (stats.submissionsScanned === stats.submissionsSkipped) {
      return stats;
    }

    const records = await db
      .select()
      .from(PostRecordSchema)
      .where(
        and(
          isNotNull(PostRecordSchema.submissionId),
          notExists(
            db
              .select({ id: PostSchema.id })
              .from(PostSchema)
              .where(
                eq(PostSchema.submissionId, PostRecordSchema.submissionId),
              ),
          ),
        ),
      )
      .orderBy(asc(PostRecordSchema.createdAt), asc(PostRecordSchema.id));
    const recordsBySubmission = this.groupBy(
      records.filter(
        (record): record is LegacyPostRecord & { submissionId: string } =>
          record.submissionId !== null,
      ),
      (record) => record.submissionId,
    );

    for (const [submissionId, submissionRecords] of recordsBySubmission) {
      try {
        const events = chunk(submissionRecords, MIGRATION_BATCH_SIZE).flatMap(
          (batch) =>
            db
              .select()
              .from(PostEventSchema)
              .where(
                inArray(
                  PostEventSchema.postRecordId,
                  batch.map((record) => record.id),
                ),
              )
              .orderBy(asc(PostEventSchema.createdAt), asc(PostEventSchema.id))
              .all(),
        );
        const eventsByRecord = this.groupBy(
          events,
          (event) => event.postRecordId,
        );
        const accountIds = new Set(
          chunk(
            [
              ...new Set(
                events.flatMap((event) =>
                  event.accountId ? [event.accountId] : [],
                ),
              ),
            ],
            MIGRATION_BATCH_SIZE,
          )
            .flatMap((ids) =>
              db
                .select({ id: AccountSchema.id })
                .from(AccountSchema)
                .where(inArray(AccountSchema.id, ids))
                .all(),
            )
            .map((account) => account.id),
        );
        const fileIds = new Set(
          chunk(
            [
              ...new Set(
                events.flatMap((event) => (event.fileId ? [event.fileId] : [])),
              ),
            ],
            MIGRATION_BATCH_SIZE,
          )
            .flatMap((ids) =>
              db
                .select({ id: SubmissionFileSchema.id })
                .from(SubmissionFileSchema)
                .where(inArray(SubmissionFileSchema.id, ids))
                .all(),
            )
            .map((file) => file.id),
        );
        const { units, eventsSkipped } = this.createUnits(
          submissionId,
          submissionRecords,
          eventsByRecord,
          accountIds,
          fileIds,
        );
        stats.eventsSkipped += eventsSkipped;
        if (units.length === 0) {
          stats.submissionsSkipped += 1;
          continue;
        }

        const postId = uuid();
        const [firstRecord] = submissionRecords;
        const { createdAt } = firstRecord;
        const inserted = db.transaction((tx) => {
          const existing = tx
            .select({ id: PostSchema.id })
            .from(PostSchema)
            .where(eq(PostSchema.submissionId, submissionId))
            .get();
          if (existing) {
            return false;
          }

          tx.insert(PostSchema)
            .values({
              id: postId,
              submissionId,
              createdAt,
              updatedAt: createdAt,
              completed: true,
              cancelled: false,
            })
            .run();
          for (const batch of chunk(units, MIGRATION_BATCH_SIZE)) {
            tx.insert(UnitOfWorkSchema)
              .values(
                batch.map(({ targetKey: _targetKey, ...unit }) => ({
                  ...unit,
                  postId,
                })),
              )
              .run();
          }
          return true;
        });

        if (inserted) {
          stats.postsCreated += 1;
          stats.unitsCreated += units.length;
        } else {
          stats.submissionsSkipped += 1;
        }
      } catch (error) {
        stats.submissionsFailed += 1;
        this.logger
          .withError(error)
          .error(`Failed to migrate legacy post history for '${submissionId}'`);
      }
    }

    return stats;
  }

  private createUnits(
    submissionId: string,
    records: LegacyPostRecord[],
    eventsByRecord: Map<string, LegacyPostEvent[]>,
    accountIds: Set<string>,
    fileIds: Set<string>,
  ): { units: MigratedUnit[]; eventsSkipped: number } {
    const units: MigratedUnit[] = [];
    const attemptsByTarget = new Map<string, number>();
    let eventsSkipped = 0;

    for (const record of records) {
      const recordEvents = eventsByRecord.get(record.id) ?? [];
      const outcomeAccounts = new Set(
        recordEvents
          .filter((event) => OUTCOME_EVENT_TYPES.has(event.eventType))
          .map((event) => event.accountId)
          .filter((accountId): accountId is string => Boolean(accountId)),
      );
      const startedByAccount = new Map(
        recordEvents
          .filter(
            (event) =>
              event.eventType === PostEventType.POST_ATTEMPT_STARTED &&
              event.accountId,
          )
          .map((event) => [event.accountId as string, event]),
      );
      const migratableEvents = recordEvents.filter(
        (event) =>
          OUTCOME_EVENT_TYPES.has(event.eventType) ||
          ((event.eventType === PostEventType.POST_ATTEMPT_COMPLETED ||
            event.eventType === PostEventType.POST_ATTEMPT_FAILED) &&
            (!event.accountId || !outcomeAccounts.has(event.accountId))),
      );

      for (const event of migratableEvents) {
        if (!event.accountId || !accountIds.has(event.accountId)) {
          eventsSkipped += 1;
          continue;
        }

        const targetKey = `${event.accountId}:${event.fileId ?? ''}`;
        const attempt = attemptsByTarget.get(targetKey) ?? 0;
        attemptsByTarget.set(targetKey, attempt + 1);
        const startedEvent = startedByAccount.get(event.accountId);
        const metadata = event.metadata ?? startedEvent?.metadata;
        const succeeded = SUCCESS_EVENT_TYPES.has(event.eventType);

        units.push({
          id: uuid(),
          createdAt: event.createdAt,
          updatedAt: event.createdAt,
          postId: '',
          submissionId,
          accountId: event.accountId,
          fileId:
            event.fileId && fileIds.has(event.fileId) ? event.fileId : null,
          fileHash: metadata?.fileSnapshot?.hash ?? null,
          attempt,
          data: {
            legacy: {
              postRecordId: record.id,
              eventId: event.id,
              eventType: event.eventType,
              resumeMode: record.resumeMode,
              accountSnapshot: metadata?.accountSnapshot,
              fileSnapshot: metadata?.fileSnapshot,
              postData: startedEvent?.metadata?.postData,
            },
          },
          response: this.createResponse(event),
          evicted: false,
          url: event.sourceUrl ?? null,
          batch:
            metadata?.batchNumber === undefined
              ? `legacy:${record.id}:${event.accountId}`
              : `legacy:${record.id}:${metadata.batchNumber}`,
          rateLimitedUntil: null,
          state: succeeded ? UnitOfWorkState.SUCCEEDED : UnitOfWorkState.FAILED,
          targetKey,
        });
      }
    }

    const latestIndexByTarget = new Map<string, number>();
    units.forEach((unit, index) =>
      latestIndexByTarget.set(unit.targetKey, index),
    );
    return {
      units: units.map((unit, index) => ({
        ...unit,
        evicted: latestIndexByTarget.get(unit.targetKey) !== index,
      })),
      eventsSkipped,
    };
  }

  private createResponse(
    event: LegacyPostEvent,
  ): Record<string, unknown> | null {
    if (event.error) {
      return {
        message: event.error.message,
        stage: event.error.stage,
        additionalInfo: event.error.additionalInfo,
        exception: {
          name: 'LegacyPostError',
          message: event.error.message,
          stack: event.error.stack,
        },
      };
    }

    const { metadata } = event;
    return metadata?.responseMessage || metadata?.additionalInfo
      ? {
          message: metadata.responseMessage,
          additionalInfo: metadata.additionalInfo,
        }
      : null;
  }

  private groupBy<T>(
    values: T[],
    getKey: (value: T) => string,
  ): Map<string, T[]> {
    const grouped = new Map<string, T[]>();
    for (const value of values) {
      const key = getKey(value);
      const bucket = grouped.get(key);
      if (bucket) {
        bucket.push(value);
      } else {
        grouped.set(key, [value]);
      }
    }
    return grouped;
  }
}
