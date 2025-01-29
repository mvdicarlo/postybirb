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
import { eq } from 'drizzle-orm';
import * as path from 'path';
import { PostyBirbService } from '../../common/service/postybirb-service';
import { FileBuffer, Submission, WebsiteOptions } from '../../drizzle/models';
import {
  Insert,
  PostyBirbDatabase,
  PostyBirbTransaction,
} from '../../drizzle/postybirb-database/postybirb-database';
import {
  fileBuffer,
  submissionFile,
  submission as SubmissionSchema,
  websiteOptions,
} from '../../drizzle/schemas';
import { MulterFileInfo } from '../../file/models/multer-file-info';
import { IsTestEnvironment } from '../../utils/test.util';
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
  extends PostyBirbService<'submission'>
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
      new PostyBirbDatabase('submission', {
        options: {
          with: {
            account: true,
          },
        },
        posts: true,
        postQueueRecord: true,
        files: true,
      }),
      webSocket,
    );
    this.repository.subscribe(
      [
        'postRecord',
        'websitePostRecord',
        'postQueueRecord',
        'submissionFile',
        'fileBuffer',
        // 'websiteOptions',
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
            validations: await this.websiteOptionsService.validateSubmission(
              s.id,
            ),
          }) as ISubmissionDto<ISubmissionMetadata>,
      ),
    );
  }

  private async populateMultiSubmission(type: SubmissionType) {
    const existing = await this.repository.findOne({
      where: (submission, { eq: equals, and }) =>
        and(
          eq(submission.id, type),
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
    const submission: Insert<'submission'> = {
      isScheduled: false,
      isMultiSubmission: !!createSubmissionDto.isMultiSubmission,
      isTemplate: !!createSubmissionDto.isTemplate,
      ...createSubmissionDto,
      schedule: {
        scheduledFor: undefined,
        scheduleType: ScheduleType.NONE,
        cron: undefined,
      },
      metadata: {},
      order: await this.repository.count(),
    };

    if (createSubmissionDto.isTemplate) {
      submission.metadata.template = {
        name: createSubmissionDto.name.trim(),
      };
    }

    if (createSubmissionDto.isMultiSubmission) {
      submission.isMultiSubmission = true;
    }

    let name = 'New submission';
    if (createSubmissionDto.name) {
      name = createSubmissionDto.name;
    } else if (file) {
      name = path.parse(file.filename).name;
    }

    submission.order = (await this.repository.count()) + 1;
    const newSubmission = await this.repository.insert(submission);
    try {
      await this.websiteOptionsService.createDefaultSubmissionOptions(
        newSubmission,
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
            newSubmission as unknown as MessageSubmission,
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
            newSubmission as unknown as FileSubmission,
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
      const updated = await this.repository.update(
        newSubmission.id,
        newSubmission.toObject(),
      );
      this.emit();
      return updated;
    } catch (err) {
      // Clean up on error, tx is too much work
      this.logger.error(err, 'Error creating submission');
      await this.repository.deleteById([newSubmission.id]);
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
        .delete(websiteOptions)
        .where(eq(websiteOptions.submissionId, id));

      const newOptionInsertions: Insert<'websiteOptions'>[] = await Promise.all(
        template.options.map((option) =>
          this.websiteOptionsService.createOptionInsertObject(
            submission,
            option.account.id,
            option.data,
            (option.isDefault ? defaultTitle : option?.data?.title) ?? '',
          ),
        ),
      );

      await tx.insert(websiteOptions).values(newOptionInsertions);
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
              accountId: option.account,
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
    const { originId, submissionIds, merge } = applyMultiSubmissionDto;
    const origin = await this.repository.findById(originId, {
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
            (o) => o.account.id === option.account.id,
          );
          if (existingOption) {
            // Don't overwrite set title
            const opts = { ...option.data, title: existingOption.data.title };
            existingOption.data = opts;
          } else {
            await this.websiteOptionsService.createOption(
              submission,
              option.account.id,
              option.data,
              option.isDefault ? undefined : option.data.title,
            );
          }
        }
      }
    } else {
      // Removes all options not included in the origin submission
      for (const submission of submissions) {
        await this.applyOverridingTemplate(submission.id, originId);
      }
    }

    this.emit();
  }

  /**
   * Duplicates a submission.
   * !Somewhat janky method of doing a clone.
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
        files: {
          with: {
            file: true,
            altFile: true,
            thumbnail: true,
          },
        },
      },
    });
    await this.repository.db.transaction(async (tx: PostyBirbTransaction) => {
      const newSubmission = await tx
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
        .returning()[0];

      await tx.insert(websiteOptions).values(
        entityToDuplicate.options.map((option) => ({
          accountId: option.accountId,
          data: option.data,
          submissionId: newSubmission.id,
          isDefault: option.account.id === NULL_ACCOUNT_ID,
        })),
      );

      for (const file of entityToDuplicate.files) {
        const newFile = await tx
          .insert(submissionFile)
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
          .returning()[0];

        const primaryFile = await tx
          .insert(fileBuffer)
          .values({
            ...file.file,
            id: undefined,
            submissionFileId: newFile.id,
          })
          .returning()[0];

        const thumbnail: FileBuffer | undefined = file.thumbnail
          ? await tx
              .insert(fileBuffer)
              .values({
                ...file.thumbnail,
                id: undefined,
                submissionFileId: newFile.id,
              })
              .returning()[0]
          : undefined;

        const altFile: FileBuffer | undefined = file.altFile
          ? await tx
              .insert(fileBuffer)
              .values({
                ...file.altFile,
                id: undefined,
                submissionFileId: newFile.id,
              })
              .returning()[0]
          : undefined;

        await tx
          .update(submissionFile)
          .set({
            primaryFileId: primaryFile.id,
            thumbnailId: thumbnail?.id,
            altFileId: altFile?.id,
          })
          .where(eq(submissionFile.id, newFile.id));

        const oldId = file.id;
        // eslint-disable-next-line prefer-destructuring
        const metadata: FileSubmissionMetadata = newSubmission.metadata;
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

    // copy.files.forEach((fileEntity) => {
    //   delete fileEntity.submission;
    //   const oldId = fileEntity.id;
    //   // Fix metadata
    //   const index = metadata.order.findIndex(
    //     (fileId) => fileId === fileEntity.id,
    //   );
    //   fileEntity.id = v4();
    //   if (index > -1) {
    //     metadata.order[index] = fileEntity.id;
    //   }

    //   if (metadata.fileMetadata[oldId]) {
    //     metadata.fileMetadata[fileEntity.id] = metadata.fileMetadata[oldId];
    //     delete metadata.fileMetadata[oldId];
    //   }

    //   if (fileEntity.altFile) {
    //     fileEntity.altFile.id = v4();
    //     delete fileEntity.altFile.parent;
    //   }

    //   if (fileEntity.file) {
    //     fileEntity.file.id = v4();
    //     delete fileEntity.file.parent;
    //   }

    //   if (fileEntity.thumbnail) {
    //     fileEntity.thumbnail.id = v4();
    //     delete fileEntity.thumbnail.parent;
    //   }
    // });

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

  public findPopulatedById(id: SubmissionId) {
    return this.repository.findById(id, { failOnMissing: true });
  }
}
