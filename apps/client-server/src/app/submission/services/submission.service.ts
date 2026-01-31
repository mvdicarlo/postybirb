/* eslint-disable no-param-reassign */
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import {
  FileBufferSchema,
  Insert,
  SubmissionFileSchema,
  SubmissionSchema,
  WebsiteOptionsSchema,
} from '@postybirb/database';
import { SUBMISSION_UPDATES } from '@postybirb/socket-events';
import {
  FileSubmission,
  FileSubmissionMetadata,
  ISubmissionDto,
  ISubmissionMetadata,
  MessageSubmission,
  NULL_ACCOUNT_ID,
  ScheduleType,
  SubmissionId,
  SubmissionMetadataType,
  SubmissionType,
} from '@postybirb/types';
import { IsTestEnvironment } from '@postybirb/utils/electron';
import { eq } from 'drizzle-orm';
import * as path from 'path';
import { PostyBirbService } from '../../common/service/postybirb-service';
import { FileBuffer, Submission, WebsiteOptions } from '../../drizzle/models';
import { PostyBirbDatabase } from '../../drizzle/postybirb-database/postybirb-database';
import { withTransactionContext } from '../../drizzle/transaction-context';
import { MulterFileInfo } from '../../file/models/multer-file-info';
import { WSGateway } from '../../web-socket/web-socket-gateway';
import { WebsiteOptionsService } from '../../website-options/website-options.service';
import { ApplyMultiSubmissionDto } from '../dtos/apply-multi-submission.dto';
import { ApplyTemplateOptionsDto } from '../dtos/apply-template-options.dto';
import { CreateSubmissionDto } from '../dtos/create-submission.dto';
import { UpdateSubmissionTemplateNameDto } from '../dtos/update-submission-template-name.dto';
import { UpdateSubmissionDto } from '../dtos/update-submission.dto';
import { FileSubmissionService } from './file-submission.service';
import { MessageSubmissionService } from './message-submission.service';

type SubmissionEntity = Submission<SubmissionMetadataType>;

/**
 * Service that handles the vast majority of submission management logic.
 * @class SubmissionService
 */
@Injectable()
export class SubmissionService
  extends PostyBirbService<'SubmissionSchema'>
  implements OnModuleInit
{
  private emitDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    @Inject(forwardRef(() => WebsiteOptionsService))
    private readonly websiteOptionsService: WebsiteOptionsService,
    @Inject(forwardRef(() => FileSubmissionService))
    private readonly fileSubmissionService: FileSubmissionService,
    private readonly messageSubmissionService: MessageSubmissionService,
    @Optional() webSocket: WSGateway,
  ) {
    super(
      new PostyBirbDatabase('SubmissionSchema', {
        options: {
          with: {
            account: true,
          },
        },
        posts: {
          with: {
            events: {
              account: true,
            },
          },
        },
        postQueueRecord: true,
        files: true,
      }),
      webSocket,
    );
    this.repository.subscribe(
      [
        'PostRecordSchema',
        'PostQueueRecordSchema',
        'SubmissionFileSchema',
        'FileBufferSchema',
      ],
      () => {
        this.emit();
      },
    );

    this.repository.subscribe(['WebsiteOptionsSchema'], (_, action) => {
      if (action === 'delete') {
        this.emit();
      }
    });
  }

  async onModuleInit() {
    await this.cleanupUninitializedSubmissions();
    await this.normalizeOrders();
    for (const type of Object.values(SubmissionType)) {
      // eslint-disable-next-line no-await-in-loop
      await this.populateMultiSubmission(type);
    }
  }

  /**
   * Normalizes order values to sequential integers on startup.
   * This cleans up fractional values that accumulate from reordering operations.
   */
  private async normalizeOrders() {
    this.logger.info('Normalizing submission orders');

    for (const type of [SubmissionType.FILE, SubmissionType.MESSAGE]) {
      const submissions = (await this.repository.findAll())
        .filter((s) => s.type === type && !s.isTemplate && !s.isMultiSubmission)
        .sort((a, b) => a.order - b.order);

      for (let i = 0; i < submissions.length; i++) {
        if (submissions[i].order !== i) {
          // eslint-disable-next-line no-await-in-loop
          await this.repository.update(submissions[i].id, { order: i });
        }
      }
    }

    this.logger.info('Order normalization complete');
  }

  /**
   * Cleans up any submissions that were left in an uninitialized state
   * (e.g., from a crash during creation).
   */
  private async cleanupUninitializedSubmissions() {
    const all = await super.findAll();
    const uninitialized = all.filter((s) => !s.isInitialized);
    if (uninitialized.length > 0) {
      const ids = uninitialized.map((s) => s.id);
      this.logger
        .withMetadata({ submissionIds: ids })
        .info(
          `Cleaning up ${uninitialized.length} uninitialized submission(s) from previous session`,
        );
      await this.repository.deleteById(ids);
    }
  }

  /**
   * Emits submissions onto websocket.
   * Debounced by 50ms to avoid rapid consecutive emits.
   * Overrides base class emit to provide submission-specific behavior.
   */
  public async emit() {
    if (IsTestEnvironment()) {
      return;
    }

    if (this.emitDebounceTimer) {
      clearTimeout(this.emitDebounceTimer);
    }

    this.emitDebounceTimer = setTimeout(() => {
      this.emitDebounceTimer = null;
      this.performEmit();
    }, 50);
  }

  private async performEmit() {
    const now = Date.now();
    super.emit({
      event: SUBMISSION_UPDATES,
      data: await this.findAllAsDto(),
    });
    this.logger.info(`Emitted submission updates in ${Date.now() - now}ms`);
  }

  public async findAllAsDto(): Promise<ISubmissionDto<ISubmissionMetadata>[]> {
    const all = (await super.findAll()).filter((s) => s.isInitialized);

    // Separate archived from non-archived for efficient processing
    const archived = all.filter((s) => s.isArchived);
    const nonArchived = all.filter((s) => !s.isArchived);

    // Validate non-archived submissions in parallel batches to avoid overwhelming the system
    const BATCH_SIZE = 10;
    const validatedNonArchived: ISubmissionDto<ISubmissionMetadata>[] = [];

    for (let i = 0; i < nonArchived.length; i += BATCH_SIZE) {
      const batch = nonArchived.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(
          async (s) =>
            ({
              ...s.toDTO(),
              validations:
                await this.websiteOptionsService.validateSubmission(s),
            }) as ISubmissionDto<ISubmissionMetadata>,
        ),
      );
      validatedNonArchived.push(...batchResults);
    }

    // Archived submissions don't need validation
    const archivedDtos = archived.map(
      (s) =>
        ({
          ...s.toDTO(),
          validations: [],
        }) as ISubmissionDto<ISubmissionMetadata>,
    );

    return [...validatedNonArchived, ...archivedDtos];
  }

  /**
   * Returns all initialized submissions.
   * Overrides base class to filter out submissions still being created.
   */
  public async findAll() {
    const all = await super.findAll();
    return all.filter((s) => s.isInitialized);
  }

  private async populateMultiSubmission(type: SubmissionType) {
    const existing = await this.repository.findOne({
      where: (submission, { eq: equals, and }) =>
        and(
          eq(submission.type, type),
          equals(submission.isMultiSubmission, true),
        ),
    });
    if (existing) {
      return;
    }

    await this.create({ name: type, type, isMultiSubmission: true });
  }

  /**
   * Creates a submission.
   *
   * @param {CreateSubmissionDto} createSubmissionDto
   * @param {MulterFileInfo} [file]
   * @return {*}  {Promise<Submission<SubmissionMetadataType>>}
   */
  async create(
    createSubmissionDto: CreateSubmissionDto,
    file?: MulterFileInfo,
  ): Promise<SubmissionEntity> {
    this.logger.withMetadata(createSubmissionDto).info('Creating Submission');

    // Templates and multi-submissions are immediately initialized since they don't need file population
    const isImmediatelyInitialized =
      !!createSubmissionDto.isMultiSubmission ||
      !!createSubmissionDto.isTemplate;

    let submission = new Submission<ISubmissionMetadata>({
      isScheduled: false,
      isMultiSubmission: !!createSubmissionDto.isMultiSubmission,
      isTemplate: !!createSubmissionDto.isTemplate,
      isInitialized: isImmediatelyInitialized,
      ...createSubmissionDto,
      schedule: {
        scheduledFor: undefined,
        scheduleType: ScheduleType.NONE,
        cron: undefined,
      },
      metadata: {
        template: createSubmissionDto.isTemplate
          ? { name: createSubmissionDto.name.trim() }
          : undefined,
      },
      order: (await this.repository.count()) + 1,
    });

    submission = await this.repository.insert(submission);

    // Determine the submission name/title
    let name = 'New submission';
    if (createSubmissionDto.name) {
      name = createSubmissionDto.name;
    } else if (file) {
      // Check for per-file title override from fileMetadata
      const fileMetadata = createSubmissionDto.fileMetadata?.find(
        (meta) => meta.filename === file.originalname,
      );
      if (fileMetadata?.title) {
        name = fileMetadata.title;
      } else {
        name = path.parse(file.filename).name;
      }
    }

    // Convert defaultOptions from DTO format to IWebsiteFormFields format
    const defaultOptions = createSubmissionDto.defaultOptions
      ? {
          tags: createSubmissionDto.defaultOptions.tags
            ? {
                overrideDefault: false,
                tags: createSubmissionDto.defaultOptions.tags,
              }
            : undefined,
          description: createSubmissionDto.defaultOptions.description,
          rating: createSubmissionDto.defaultOptions.rating,
        }
      : undefined;

    try {
      await this.websiteOptionsService.createDefaultSubmissionOptions(
        submission,
        name,
        defaultOptions,
      );

      switch (createSubmissionDto.type) {
        case SubmissionType.MESSAGE: {
          if (file) {
            throw new BadRequestException(
              'A file was provided for SubmissionType Message.',
            );
          }

          await this.messageSubmissionService.populate(
            submission as unknown as MessageSubmission,
            createSubmissionDto,
          );
          break;
        }

        case SubmissionType.FILE: {
          if (
            createSubmissionDto.isTemplate ||
            createSubmissionDto.isMultiSubmission
          ) {
            // Don't need to populate on a template
            break;
          }

          if (!file) {
            throw new BadRequestException(
              'No file provided for SubmissionType FILE.',
            );
          }

          // This currently mutates the submission object metadata
          await this.fileSubmissionService.populate(
            submission as unknown as FileSubmission,
            createSubmissionDto,
            file,
          );
          break;
        }

        default: {
          throw new BadRequestException(
            `Unknown SubmissionType: ${createSubmissionDto.type}.`,
          );
        }
      }

      // Re-save to capture any mutations during population and mark as initialized
      await this.repository.update(submission.id, {
        ...submission.toObject(),
        isInitialized: true,
      });
      this.emit();
      return await this.findById(submission.id);
    } catch (err) {
      // Clean up on error, tx is too much work
      this.logger.error(err, 'Error creating submission');
      await this.repository.deleteById([submission.id]);
      throw err;
    }
  }

  /**
   * Applies a template to a submission.
   * Primarily used when a submission is created from a template.
   * Or when applying overriding multi-submission options.
   *
   * @param {SubmissionId} id
   * @param {SubmissionId} templateId
   */
  async applyOverridingTemplate(id: SubmissionId, templateId: SubmissionId) {
    this.logger
      .withMetadata({ id, templateId })
      .info('Applying template to submission');
    const submission = await this.findById(id, { failOnMissing: true });
    const template: Submission = await this.findById(templateId, {
      failOnMissing: true,
    });

    if (!template.metadata.template) {
      throw new BadRequestException('Template Id provided is not a template.');
    }

    const defaultOption: WebsiteOptions = submission.options.find(
      (option: WebsiteOptions) => option.accountId === NULL_ACCOUNT_ID,
    );
    const defaultTitle = defaultOption?.data?.title;

    // Prepare all option insertions before the transaction
    const newOptionInsertions: Insert<'WebsiteOptionsSchema'>[] =
      await Promise.all(
        template.options.map((option) =>
          this.websiteOptionsService.createOptionInsertObject(
            submission,
            option.accountId,
            option.data,
            (option.isDefault ? defaultTitle : option?.data?.title) ?? '',
          ),
        ),
      );

    await withTransactionContext(this.repository.db, async (ctx) => {
      // clear all existing options
      await ctx
        .getDb()
        .delete(WebsiteOptionsSchema)
        .where(eq(WebsiteOptionsSchema.submissionId, id));

      await ctx
        .getDb()
        .insert(WebsiteOptionsSchema)
        .values(newOptionInsertions);

      // Track all created options for cleanup if needed
      newOptionInsertions.forEach((option) => {
        if (option.id) {
          ctx.track('WebsiteOptionsSchema', option.id);
        }
      });
    });

    try {
      return await this.findById(id);
    } catch (err) {
      throw new BadRequestException(err);
    }
  }

  /**
   * Updates a submission.
   *
   * @param {SubmissionId} id
   * @param {UpdateSubmissionDto} update
   */
  async update(id: SubmissionId, update: UpdateSubmissionDto) {
    this.logger.withMetadata(update).info(`Updating Submission '${id}'`);
    const submission = await this.findById(id, { failOnMissing: true });

    const scheduleType =
      update.scheduleType ?? submission.schedule.scheduleType;
    const updates: Pick<
      SubmissionEntity,
      'metadata' | 'isArchived' | 'isScheduled' | 'schedule'
    > = {
      metadata: {
        ...submission.metadata,
        ...(update.metadata ?? {}),
      },
      isArchived: update.isArchived ?? submission.isArchived,
      isScheduled:
        scheduleType === ScheduleType.NONE
          ? false
          : (update.isScheduled ?? submission.isScheduled),
      schedule:
        scheduleType === ScheduleType.NONE
          ? {
              scheduleType: ScheduleType.NONE,
              scheduledFor: undefined,
              cron: undefined,
            }
          : {
              scheduledFor:
                scheduleType === ScheduleType.SINGLE && update.scheduledFor
                  ? new Date(update.scheduledFor).toISOString()
                  : (update.scheduledFor ?? submission.schedule.scheduledFor),
              scheduleType:
                update.scheduleType ?? submission.schedule.scheduleType,
              cron: update.cron ?? submission.schedule.cron,
            },
    };

    const optionChanges: Promise<unknown>[] = [];

    // Removes unused website options
    if (update.deletedWebsiteOptions?.length) {
      update.deletedWebsiteOptions.forEach((deletedOptionId) => {
        optionChanges.push(this.websiteOptionsService.remove(deletedOptionId));
      });
    }

    // Creates or updates new website options
    if (update.newOrUpdatedOptions?.length) {
      update.newOrUpdatedOptions.forEach((option) => {
        if (option.createdAt) {
          optionChanges.push(
            this.websiteOptionsService.update(option.id, {
              data: option.data,
            }),
          );
        } else {
          optionChanges.push(
            this.websiteOptionsService.create({
              accountId: option.accountId,
              data: option.data,
              submissionId: submission.id,
            }),
          );
        }
      });
    }

    await Promise.allSettled(optionChanges);

    try {
      // Update Here
      await this.repository.update(id, updates);
      this.emit();
      return await this.findById(id);
    } catch (err) {
      throw new BadRequestException(err);
    }
  }

  public async remove(id: SubmissionId) {
    const result = await super.remove(id);
    this.emit();
    return result;
  }

  async applyMultiSubmission(applyMultiSubmissionDto: ApplyMultiSubmissionDto) {
    const { submissionToApply, submissionIds, merge } = applyMultiSubmissionDto;
    const origin = await this.repository.findById(submissionToApply, {
      failOnMissing: true,
    });
    const submissions = await this.repository.find({
      where: (submission, { inArray }) => inArray(submission.id, submissionIds),
    });
    if (merge) {
      // Keeps unique options, overwrites overlapping options
      for (const submission of submissions) {
        for (const option of origin.options) {
          const existingOption = submission.options.find(
            (o) => o.accountId === option.accountId,
          );
          if (existingOption) {
            // Don't overwrite set title
            const opts = { ...option.data, title: existingOption.data.title };
            await this.websiteOptionsService.update(existingOption.id, {
              data: opts,
            });
          } else {
            await this.websiteOptionsService.createOption(
              submission,
              option.accountId,
              option.data,
              option.isDefault ? undefined : option.data.title,
            );
          }
        }
      }
    } else {
      // Removes all options not included in the origin submission
      for (const submission of submissions) {
        const { options } = submission;
        const defaultOptions = options.find((option) => option.isDefault);
        const defaultTitle = defaultOptions?.data.title;
        await Promise.all(
          options.map((option) => this.websiteOptionsService.remove(option.id)),
        );
        // eslint-disable-next-line no-restricted-syntax
        for (const option of origin.options) {
          const opts = { ...option.data };
          if (option.isDefault) {
            opts.title = defaultTitle;
          }
          await this.websiteOptionsService.createOption(
            submission,
            option.accountId,
            opts,
            option.isDefault ? defaultTitle : option.data.title,
          );
        }
      }
    }

    this.emit();
  }

  /**
   * Applies selected template options to multiple submissions.
   * Upserts options (update if exists, create if new) with merge behavior.
   *
   * @param dto - The apply template options DTO
   * @returns Object with success/failure counts
   */
  async applyTemplateOptions(dto: ApplyTemplateOptionsDto): Promise<{
    success: number;
    failed: number;
    errors: Array<{ submissionId: SubmissionId; error: string }>;
  }> {
    const { targetSubmissionIds, options, overrideTitle, overrideDescription } =
      dto;

    this.logger
      .withMetadata({
        targetCount: targetSubmissionIds.length,
        optionCount: options.length,
      })
      .info('Applying template options to submissions');

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ submissionId: SubmissionId; error: string }>,
    };

    for (const submissionId of targetSubmissionIds) {
      try {
        const submission = await this.findById(submissionId, {
          failOnMissing: true,
        });

        for (const templateOption of options) {
          // Find existing option for this account
          const existingOption = submission.options.find(
            (o) => o.accountId === templateOption.accountId,
          );

          // Prepare the data to apply
          const dataToApply = { ...templateOption.data };

          // Handle title override: only replace if overrideTitle is true AND template has non-empty title
          if (!overrideTitle || !dataToApply.title?.trim()) {
            delete dataToApply.title;
          }

          // Handle description override: only replace if overrideDescription is true AND template has description
          if (!overrideDescription || !dataToApply.description?.description) {
            delete dataToApply.description;
          }

          if (existingOption) {
            // Upsert: merge existing data with template data
            const mergedData = {
              ...existingOption.data,
              ...dataToApply,
            };
            await this.websiteOptionsService.update(existingOption.id, {
              data: mergedData,
            });
          } else {
            // Create new option
            await this.websiteOptionsService.createOption(
              submission,
              templateOption.accountId,
              dataToApply,
              dataToApply.title,
            );
          }
        }

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          submissionId,
          error: error instanceof Error ? error.message : String(error),
        });
        this.logger
          .withMetadata({ submissionId, error })
          .error('Failed to apply template options to submission');
      }
    }

    this.emit();
    return results;
  }

  /**
   * Duplicates a submission.
   * @param {string} id
   */
  public async duplicate(id: SubmissionId) {
    this.logger.info(`Duplicating Submission '${id}'`);
    const entityToDuplicate = await this.repository.findOne({
      where: (submission, { eq: equals }) => equals(submission.id, id),
      with: {
        options: {
          with: {
            account: true,
          },
        },
        files: true,
      },
    });
    await withTransactionContext(this.repository.db, async (ctx) => {
      const newSubmission = (
        await ctx
          .getDb()
          .insert(SubmissionSchema)
          .values({
            metadata: entityToDuplicate.metadata,
            type: entityToDuplicate.type,
            isScheduled: entityToDuplicate.isScheduled,
            schedule: entityToDuplicate.schedule,
            isMultiSubmission: entityToDuplicate.isMultiSubmission,
            isTemplate: entityToDuplicate.isTemplate,
            isInitialized: false, // Will be set to true at the end of the transaction
            order: entityToDuplicate.order,
          })
          .returning()
      )[0];
      ctx.track('SubmissionSchema', newSubmission.id);

      const optionValues = entityToDuplicate.options.map((option) => ({
        ...option,
        id: undefined,
        submissionId: newSubmission.id,
      }));
      await ctx.getDb().insert(WebsiteOptionsSchema).values(optionValues);

      for (const file of entityToDuplicate.files) {
        await file.load();
        const newFile = (
          await ctx
            .getDb()
            .insert(SubmissionFileSchema)
            .values({
              submissionId: newSubmission.id,
              fileName: file.fileName,
              mimeType: file.mimeType,
              hash: file.hash,
              size: file.size,
              height: file.height,
              width: file.width,
              hasThumbnail: file.hasThumbnail,
              hasCustomThumbnail: file.hasCustomThumbnail,
              hasAltFile: file.hasAltFile,
              metadata: file.metadata,
              order: file.order,
            })
            .returning()
        )[0];
        ctx.track('SubmissionFileSchema', newFile.id);

        const primaryFile = (
          await ctx
            .getDb()
            .insert(FileBufferSchema)
            .values({
              ...file.file,
              id: undefined,
              submissionFileId: newFile.id,
            })
            .returning()
        )[0];
        ctx.track('FileBufferSchema', primaryFile.id);

        const thumbnail: FileBuffer | undefined = file.thumbnail
          ? (
              await ctx
                .getDb()
                .insert(FileBufferSchema)
                .values({
                  ...file.thumbnail,
                  id: undefined,
                  submissionFileId: newFile.id,
                })
                .returning()
            )[0]
          : undefined;
        if (thumbnail) {
          ctx.track('FileBufferSchema', thumbnail.id);
        }

        const altFile: FileBuffer | undefined = file.altFile
          ? (
              await ctx
                .getDb()
                .insert(FileBufferSchema)
                .values({
                  ...file.altFile,
                  id: undefined,
                  submissionFileId: newFile.id,
                })
                .returning()
            )[0]
          : undefined;
        if (altFile) {
          ctx.track('FileBufferSchema', altFile.id);
        }

        await ctx
          .getDb()
          .update(SubmissionFileSchema)
          .set({
            primaryFileId: primaryFile.id,
            thumbnailId: thumbnail?.id,
            altFileId: altFile?.id,
          })
          .where(eq(SubmissionFileSchema.id, newFile.id));

        const oldId = file.id;
        // eslint-disable-next-line prefer-destructuring
        const metadata: FileSubmissionMetadata =
          newSubmission.metadata as FileSubmissionMetadata;
      }

      // Save updated metadata and mark as initialized
      await ctx
        .getDb()
        .update(SubmissionSchema)
        .set({ metadata: newSubmission.metadata, isInitialized: true })
        .where(eq(SubmissionSchema.id, newSubmission.id));
    });
    this.emit();
  }

  async updateTemplateName(
    id: SubmissionId,
    updateSubmissionDto: UpdateSubmissionTemplateNameDto,
  ) {
    const entity = await this.findById(id, { failOnMissing: true });

    if (!entity.isTemplate) {
      throw new BadRequestException(`Submission '${id}' is not a template`);
    }

    const name = updateSubmissionDto.name.trim();
    if (!updateSubmissionDto.name) {
      throw new BadRequestException(
        'Template name cannot be empty or whitespace',
      );
    }

    if (entity.metadata.template) {
      entity.metadata.template.name = name;
    }
    const result = await this.repository.update(id, {
      metadata: entity.metadata,
    });
    this.emit();
    return result;
  }

  async reorder(
    id: SubmissionId,
    targetId: SubmissionId,
    position: 'before' | 'after',
  ) {
    const moving = await this.findById(id, { failOnMissing: true });
    const target = await this.findById(targetId, { failOnMissing: true });

    // Ensure same type (FILE or MESSAGE)
    if (moving.type !== target.type) {
      throw new BadRequestException(
        'Cannot reorder across different submission types',
      );
    }

    // Get all submissions of the same type, sorted by order
    // Exclude templates and multi-submissions from ordering
    const allOfType = (await this.repository.findAll())
      .filter(
        (s) =>
          s.type === moving.type && !s.isTemplate && !s.isMultiSubmission,
      )
      .sort((a, b) => a.order - b.order);

    const targetIndex = allOfType.findIndex((s) => s.id === targetId);
    if (targetIndex === -1) {
      throw new NotFoundException(`Target submission '${targetId}' not found`);
    }

    let newOrder: number;

    if (position === 'before') {
      if (targetIndex === 0) {
        // Insert at the very beginning
        newOrder = target.order - 1;
      } else {
        // Insert between previous and target
        const prevOrder = allOfType[targetIndex - 1].order;
        newOrder = (prevOrder + target.order) / 2;
      }
    } else if (targetIndex === allOfType.length - 1) {
      // position === 'after', Insert at the very end
      newOrder = target.order + 1;
    } else {
      // position === 'after', Insert between target and next
      const nextOrder = allOfType[targetIndex + 1].order;
      newOrder = (target.order + nextOrder) / 2;
    }

    await this.repository.update(id, { order: newOrder });
    this.emit();
  }

  async unarchive(id: SubmissionId) {
    const submission = await this.findById(id, { failOnMissing: true });
    if (!submission.isArchived) {
      throw new BadRequestException(`Submission '${id}' is not archived`);
    }
    await this.repository.update(id, {
      isArchived: false,
    });
    this.emit();
  }

  async archive(id: SubmissionId) {
    const submission = await this.findById(id, { failOnMissing: true });
    if (submission.isArchived) {
      throw new BadRequestException(`Submission '${id}' is already archived`);
    }
    await this.repository.update(id, {
      isArchived: true,
    });
    this.emit();
  }
}
