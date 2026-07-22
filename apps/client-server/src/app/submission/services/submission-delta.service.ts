import { Injectable, Optional } from '@nestjs/common';
import {
    FileBufferRepository,
    PostQueueRecordRepository,
    SchemaKey,
    Submission,
    SubmissionFileRepository,
    SubmissionRepository,
    WebsiteOptionsRepository,
} from '@postybirb/database';
import { Logger } from '@postybirb/logger';
import { SUBMISSION_DELTA } from '@postybirb/socket-events';
import {
    EntityId,
    ISubmissionDelta,
    ISubmissionDto,
    ISubmissionMetadata,
    SubmissionId,
    SubmissionMetadataType,
} from '@postybirb/types';
import { toError } from '@postybirb/utils/common';
import { ValidationService } from '../../validation/validation.service';
import { WSGateway } from '../../web-socket/web-socket-gateway';

type SubmissionEntity = Submission<SubmissionMetadataType>;

const DTO_BATCH_SIZE = 10;

const QUERY_BATCH_SIZE = 100;

@Injectable()
export class SubmissionDeltaService {
  private readonly logger = Logger(this.constructor.name);

  private readonly repository = new SubmissionRepository();

  private readonly postQueueRepository = new PostQueueRecordRepository();

  private readonly submissionFileRepository = new SubmissionFileRepository();

  private readonly fileBufferRepository = new FileBufferRepository();

  private readonly websiteOptionsRepository = new WebsiteOptionsRepository();

  private readonly pendingUpsertIds = new Set<SubmissionId>();

  private readonly pendingRemovalIds = new Set<SubmissionId>();

  private deltaFlushHandle: ReturnType<typeof setImmediate> | null = null;

  private isDeltaFlushRunning = false;

  constructor(
    private readonly validationService: ValidationService,
    @Optional() private readonly webSocket?: WSGateway,
  ) {
    this.repository.subscribe('SubmissionSchema', (ids, action) => {
      if (action === 'delete') {
        this.emitRemovals(ids);
      } else {
        this.emitUpserts(ids);
      }
    });

    this.repository.subscribe(
      [
        'PostQueueRecordSchema',
        'SubmissionFileSchema',
        'FileBufferSchema',
        'WebsiteOptionsSchema',
      ],
      (ids, action, schemaKey) => {
        if (action !== 'delete') {
          this.emitRelatedUpserts(schemaKey, ids).catch((error) =>
            this.logger
              .withError(toError(error))
              .error('Failed to route related submission update'),
          );
        }
      },
    );

    this.repository.subscribe(
      ['AccountSchema', 'WebsiteDataSchema'],
      (ids, _action, schemaKey) => {
        this.emitRelatedUpserts(schemaKey, ids).catch((error) =>
          this.logger
            .withError(toError(error))
            .error('Failed to route account-related submission update'),
        );
      },
    );

    this.repository.subscribe(
      [
        'CustomShortcutSchema',
        'SettingsSchema',
        'TagConverterSchema',
        'UserConverterSchema',
      ],
      () => {
        this.emitComputedValidationUpserts().catch((error) =>
          this.logger
            .withError(toError(error))
            .error('Failed to route computed validation update'),
        );
      },
    );
  }

  public emitUpserts(ids: SubmissionId | SubmissionId[]): void {
    if (!this.webSocket) return;

    for (const id of Array.isArray(ids) ? ids : [ids]) {
      if (!this.pendingRemovalIds.has(id)) {
        this.pendingUpsertIds.add(id);
      }
    }
    this.scheduleFlush();
  }

  public emitRemovals(ids: SubmissionId | SubmissionId[]): void {
    if (!this.webSocket) return;

    for (const id of Array.isArray(ids) ? ids : [ids]) {
      this.pendingUpsertIds.delete(id);
      this.pendingRemovalIds.add(id);
    }
    this.scheduleFlush();
  }

  public async findAllAsDto(): Promise<
    ISubmissionDto<ISubmissionMetadata>[]
  > {
    const submissions = (await this.repository.findAll()).filter(
      (submission) => submission.isInitialized,
    );
    return this.submissionsAsDto(submissions);
  }

  private scheduleFlush(): void {
    if (this.deltaFlushHandle || this.isDeltaFlushRunning) return;

    this.deltaFlushHandle = setImmediate(() => {
      this.deltaFlushHandle = null;
      this.flush().catch((error) =>
        this.logger
          .withError(toError(error))
          .error('Failed to flush submission deltas'),
      );
    });
  }

  private async flush(): Promise<void> {
    if (this.isDeltaFlushRunning) return;
    this.isDeltaFlushRunning = true;

    try {
      while (this.pendingUpsertIds.size || this.pendingRemovalIds.size) {
        const startedAt = Date.now();
        const upsertIds = [...this.pendingUpsertIds];
        const removalIds = new Set(this.pendingRemovalIds);
        this.pendingUpsertIds.clear();
        this.pendingRemovalIds.clear();

        const upserts = await this.findByIdsAsDto(
          upsertIds.filter((id) => !removalIds.has(id)),
        );

        for (const id of this.pendingRemovalIds) {
          removalIds.add(id);
          this.pendingUpsertIds.delete(id);
        }
        this.pendingRemovalIds.clear();

        const data: ISubmissionDelta<ISubmissionMetadata> = {
          upserts: upserts.filter((dto) => !removalIds.has(dto.id)),
          removals: [...removalIds],
        };
        if (data.upserts.length || data.removals.length) {
          this.emitDelta(data);
          this.logger.info(
            `Emitted ${data.upserts.length} submission upsert(s) and ${data.removals.length} removal(s) in ${Date.now() - startedAt}ms`,
          );
        }
      }
    } catch (error) {
      this.logger
        .withError(toError(error))
        .error('Failed to emit submission delta');
    } finally {
      this.isDeltaFlushRunning = false;
      if (this.pendingUpsertIds.size || this.pendingRemovalIds.size) {
        this.scheduleFlush();
      }
    }
  }

  private emitDelta(data: ISubmissionDelta<ISubmissionMetadata>): void {
    try {
      this.webSocket?.emit({ event: SUBMISSION_DELTA, data });
    } catch (error) {
      this.logger
        .withError(toError(error))
        .error('Failed to publish submission delta');
    }
  }

  private async emitRelatedUpserts(
    schemaKey: SchemaKey,
    ids: EntityId[],
  ): Promise<void> {
    try {
      let submissionIds: SubmissionId[] = [];
      switch (schemaKey) {
        case 'PostQueueRecordSchema': {
          const records = await this.postQueueRepository.find({
            where: (record, { inArray }) => inArray(record.id, ids),
            with: {},
          });
          submissionIds = records.map((record) => record.submissionId);
          break;
        }
        case 'SubmissionFileSchema': {
          const files = await this.submissionFileRepository.find({
            where: (file, { inArray }) => inArray(file.id, ids),
            with: {},
          });
          submissionIds = files.map((file) => file.submissionId);
          break;
        }
        case 'FileBufferSchema': {
          const buffers = await this.fileBufferRepository.find({
            where: (buffer, { inArray }) => inArray(buffer.id, ids),
            with: {},
          });
          const fileIds = buffers.map((buffer) => buffer.submissionFileId);
          if (fileIds.length) {
            const files = await this.submissionFileRepository.find({
              where: (file, { inArray }) => inArray(file.id, fileIds),
              with: {},
            });
            submissionIds = files.map((file) => file.submissionId);
          }
          break;
        }
        case 'WebsiteOptionsSchema': {
          const options = await this.websiteOptionsRepository.find({
            where: (option, { inArray }) => inArray(option.id, ids),
            with: {},
          });
          submissionIds = options.map((option) => option.submissionId);
          break;
        }
        case 'AccountSchema':
        case 'WebsiteDataSchema': {
          const options = await this.websiteOptionsRepository.find({
            where: (option, { inArray }) => inArray(option.accountId, ids),
            with: {},
          });
          submissionIds = options.map((option) => option.submissionId);
          break;
        }
        default:
          return;
      }

      if (submissionIds.length) {
        this.emitUpserts(submissionIds);
      }
    } catch (error) {
      this.logger
        .withError(toError(error))
        .withMetadata({ schemaKey, ids })
        .warn('Failed to resolve related submission updates');
    }
  }

  private async emitComputedValidationUpserts(): Promise<void> {
    const submissions = await this.repository.find({
      where: (submission, { and, eq }) =>
        and(
          eq(submission.isInitialized, true),
          eq(submission.isArchived, false),
        ),
      with: {},
    });
    const submissionIds = submissions.map((submission) => submission.id);
    if (submissionIds.length) {
      this.emitUpserts(submissionIds);
    }
  }

  private async findByIdsAsDto(
    ids: SubmissionId[],
  ): Promise<ISubmissionDto<ISubmissionMetadata>[]> {
    const uniqueIds = [...new Set(ids)];
    const submissions: SubmissionEntity[] = [];

    for (let index = 0; index < uniqueIds.length; index += QUERY_BATCH_SIZE) {
      const batchIds = uniqueIds.slice(index, index + QUERY_BATCH_SIZE);
      // eslint-disable-next-line no-await-in-loop
      const batch = await this.repository.find({
        where: (submission, { inArray }) =>
          inArray(submission.id, batchIds),
      });
      submissions.push(
        ...batch.filter((submission) => submission.isInitialized),
      );
    }

    return this.submissionsAsDto(submissions);
  }

  private async submissionsAsDto(
    submissions: SubmissionEntity[],
  ): Promise<ISubmissionDto<ISubmissionMetadata>[]> {
    const archived = submissions.filter((submission) => submission.isArchived);
    const active = submissions.filter((submission) => !submission.isArchived);
    const activeDtos: ISubmissionDto<ISubmissionMetadata>[] = [];

    for (let index = 0; index < active.length; index += DTO_BATCH_SIZE) {
      const batch = active.slice(index, index + DTO_BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(
          async (submission) =>
            ({
              ...submission.toDTO(),
              validations:
                await this.validationService.validateSubmission(submission),
            }) as ISubmissionDto<ISubmissionMetadata>,
        ),
      );
      activeDtos.push(...batchResults);
    }

    const archivedDtos = archived.map(
      (submission) =>
        ({
          ...submission.toDTO(),
          validations: [],
        }) as ISubmissionDto<ISubmissionMetadata>,
    );

    return [...activeDtos, ...archivedDtos];
  }
}