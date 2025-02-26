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
  PostyBirbTransaction,
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
import { MulterFileInfo } from '../../file/models/multer-file-info';
import { WSGateway } from '../../web-socket/web-socket-gateway';
import { WebsiteOptionsService } from '../../website-options/website-options.service';
import { ApplyMultiSubmissionDto } from '../dtos/apply-multi-submission.dto';
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
  constructor(
    @Inject(forwardRef(() => WebsiteOptionsService))
    private readonly websiteOptionsService: WebsiteOptionsService,
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
            children: true,
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
        'WebsitePostRecordSchema',
        'PostQueueRecordSchema',
        'SubmissionFileSchema',
        'FileBufferSchema',
        // 'WebsiteOptionsSchema',
      ],
      () => {
        this.emit();
      },
    );
  }

  onModuleInit() {
    Object.values(SubmissionType).forEach((type) => {
      this.populateMultiSubmission(type);
    });
  }

  /**
   * Emits submissions onto websocket.
   */
  public async emit() {
    if (IsTestEnvironment()) {
      return;
    }
    super.emit({
      event: SUBMISSION_UPDATES,
      data: await this.findAllAsDto(),
    });
  }

  public async findAllAsDto(): Promise<ISubmissionDto<ISubmissionMetadata>[]> {
    const all = await super.findAll();
    return Promise.all(
      all.map(
        async (s) =>
          ({
            ...s.toDTO(),
            validations: s.isArchived
              ? []
              : await this.websiteOptionsService.validateSubmission(s.id),
          }) as ISubmissionDto<ISubmissionMetadata>,
      ),
    );
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

    let submission = new Submission<ISubmissionMetadata>({
      isScheduled: false,
      isMultiSubmission: !!createSubmissionDto.isMultiSubmission,
      isTemplate: !!createSubmissionDto.isTemplate,
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

    let name = 'New submission';
    if (createSubmissionDto.name) {
      name = createSubmissionDto.name;
    } else if (file) {
      name = path.parse(file.filename).name;
    }

    try {
      await this.websiteOptionsService.createDefaultSubmissionOptions(
        submission,
        name,
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

      // Re-save to capture any mutations during population
      await this.repository.update(submission.id, submission.toObject());
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
    await this.repository.db.transaction(async (tx: PostyBirbTransaction) => {
      // clear all existing options
      await tx
        .delete(WebsiteOptionsSchema)
        .where(eq(WebsiteOptionsSchema.submissionId, id));

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

      await tx.insert(WebsiteOptionsSchema).values(newOptionInsertions);
    });

    try {
      this.emit();
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

    submission.isScheduled = update.isScheduled ?? submission.isScheduled;
    submission.schedule = {
      scheduledFor: update.scheduledFor ?? submission.schedule.scheduledFor,
      scheduleType: update.scheduleType ?? submission.schedule.scheduleType,
      cron: update.cron ?? submission.schedule.cron,
    };

    if (submission.schedule.scheduleType === ScheduleType.NONE) {
      submission.schedule.scheduledFor = undefined;
      submission.schedule.cron = undefined;
      submission.isScheduled = false;
    }

    // Ensure ISO format
    if (
      submission.schedule.scheduleType === ScheduleType.SINGLE &&
      submission.schedule.scheduledFor
    ) {
      submission.schedule.scheduledFor = new Date(
        submission.schedule.scheduledFor,
      ).toISOString();
    }

    submission.metadata = {
      ...submission.metadata,
      ...update.metadata,
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
      await this.repository.update(id, {
        metadata: submission.metadata,
        isScheduled: submission.isScheduled,
        schedule: submission.schedule,
      });
      this.emit();
      return await this.findById(id);
    } catch (err) {
      throw new BadRequestException(err);
    }
  }

  public async remove(id: SubmissionId) {
    await super.remove(id);
    this.emit();
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
    await this.repository.db.transaction(async (tx: PostyBirbTransaction) => {
      const newSubmission = (
        await tx
          .insert(SubmissionSchema)
          .values({
            metadata: entityToDuplicate.metadata,
            type: entityToDuplicate.type,
            isScheduled: entityToDuplicate.isScheduled,
            schedule: entityToDuplicate.schedule,
            isMultiSubmission: entityToDuplicate.isMultiSubmission,
            isTemplate: entityToDuplicate.isTemplate,
            order: entityToDuplicate.order,
          })
          .returning()
      )[0];

      await tx.insert(WebsiteOptionsSchema).values(
        entityToDuplicate.options.map((option) => ({
          ...option,
          id: undefined,
          submissionId: newSubmission.id,
        })),
      );

      for (const file of entityToDuplicate.files) {
        await file.load();
        const newFile = (
          await tx
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
            })
            .returning()
        )[0];

        const primaryFile = (
          await tx
            .insert(FileBufferSchema)
            .values({
              ...file.file,
              id: undefined,
              submissionFileId: newFile.id,
            })
            .returning()
        )[0];

        const thumbnail: FileBuffer | undefined = file.thumbnail
          ? (
              await tx
                .insert(FileBufferSchema)
                .values({
                  ...file.thumbnail,
                  id: undefined,
                  submissionFileId: newFile.id,
                })
                .returning()
            )[0]
          : undefined;

        const altFile: FileBuffer | undefined = file.altFile
          ? (
              await tx
                .insert(FileBufferSchema)
                .values({
                  ...file.altFile,
                  id: undefined,
                  submissionFileId: newFile.id,
                })
                .returning()
            )[0]
          : undefined;

        await tx
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
        // Fix metadata
        const index = metadata.order.findIndex((fileId) => fileId === file.id);
        if (index > -1) {
          metadata.order[index] = newFile.id;
        }

        if (metadata.fileMetadata[oldId]) {
          metadata.fileMetadata[newFile.id] = metadata.fileMetadata[oldId];
          delete metadata.fileMetadata[oldId];
        }
      }
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
    return this.repository.update(id, { metadata: entity.metadata });
  }

  async reorder(id: SubmissionId, index: number) {
    const allSubmissions = (await this.repository.findAll()).sort(
      (a, b) => a.order - b.order,
    );
    const movedSubmissionIndex = allSubmissions.findIndex((s) => s.id === id);
    if (movedSubmissionIndex === -1) {
      throw new NotFoundException(`Submission '${id}' not found`);
    }

    if (index === movedSubmissionIndex) {
      return;
    }

    // Remove the submission from its current position
    const [movedSubmission] = allSubmissions.splice(movedSubmissionIndex, 1);

    // Adjust index if necessary
    if (index > allSubmissions.length) {
      index = allSubmissions.length;
    }

    // Insert the submission at the new index
    allSubmissions.splice(index, 0, movedSubmission);

    // Update the order property for all submissions
    allSubmissions.forEach((submission, i) => {
      submission.order = i;
    });

    // Save changes
    await Promise.all(
      allSubmissions.map((s) =>
        this.repository.update(s.id, { order: s.order }),
      ),
    );
    this.emit();
  }
}
