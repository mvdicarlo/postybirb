/* eslint-disable no-param-reassign */
import { serialize } from '@mikro-orm/core';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { SUBMISSION_UPDATES } from '@postybirb/socket-events';
import {
  FileSubmission,
  FileSubmissionMetadata,
  ISubmission,
  ISubmissionDto,
  ISubmissionMetadata,
  MessageSubmission,
  NULL_ACCOUNT_ID,
  ScheduleType,
  SubmissionId,
  SubmissionMetadataType,
  SubmissionType,
} from '@postybirb/types';
import { cloneDeep } from 'lodash';
import * as path from 'path';
import { v4 } from 'uuid';
import { PostyBirbService } from '../../common/service/postybirb-service';
import { Submission, WebsiteOptions } from '../../drizzle/models';
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
    super('submission', webSocket);
    this.repository.subscribe(
      [
        'postRecord',
        'websitePostRecord',
        'postQueueRecord',
        'submissionFile',
        'fileBuffer',
        'websiteOptions',
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
    // !BUG - This protects against unit test failures, but is not a good solution.
    // Ideally fixed by upgrading mikro-orm and using a proper event emitter.
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
      type,
      metadata: { isMultiSubmission: true },
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
    const submission = new Submission({
      ...createSubmissionDto,
      isScheduled: false,
      schedule: {
        scheduledFor: undefined,
        scheduleType: ScheduleType.NONE,
        cron: undefined,
      },
    });

    if (createSubmissionDto.isTemplate) {
      submission.metadata.template = {
        name: createSubmissionDto.name.trim(),
      };
    }

    if (createSubmissionDto.isMultiSubmission) {
      submission.metadata.isMultiSubmission = true;
      submission.id = `MULTI-${submission.type}`;
    }

    let name = 'New submission';
    if (createSubmissionDto.name) {
      name = createSubmissionDto.name;
    } else if (file) {
      name = path.parse(file.filename).name;
    }

    submission.options.add(
      await this.websiteOptionsService.createDefaultSubmissionOptions(
        submission as ISubmission,
        name,
      ),
    );

    submission.order = (await this.repository.count()) + 1;
    await this.repository.persist(submission);

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
    await this.repository.persistAndFlush(submission);
    this.emit();
    return submission;
  }

  /**
   * Applies a template to a submission.
   * Primarily used when a submission is created from a template.
   *
   * @param {string} id
   * @param {string} templateId
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

    const defaultOption: WebsiteOptions = submission.options
      .getItems()
      .find((option: WebsiteOptions) => option.account.id === NULL_ACCOUNT_ID);
    submission.options.removeAll();
    const options = template.options.getItems();
    const newOptions = await Promise.all(
      options.map(async (option: WebsiteOptions) => {
        const newOption = await this.websiteOptionsService.createOption(
          submission,
          option.account.id,
          option.data,
          defaultOption.data.title,
        );
        return newOption;
      }),
    );

    submission.options.add(newOptions);

    try {
      await this.repository.persistAndFlush(submission);
      this.emit();
      return await this.findById(id);
    } catch (err) {
      throw new BadRequestException(err);
    }
  }

  /**
   * Updates a submission.
   *
   * @param {string} id
   * @param {UpdateSubmissionDto} update
   */
  async update(id: string, update: UpdateSubmissionDto) {
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
              account: option.account,
              data: option.data,
              submission: submission.id,
            }),
          );
        }
      });
    }

    await Promise.allSettled(optionChanges);

    try {
      await this.repository.flush();
      this.emit();
      return await this.findById(id);
    } catch (err) {
      throw new BadRequestException(err);
    }
  }

  public async remove(id: string) {
    await super.remove(id);
    this.emit();
  }

  async applyMultiSubmission(applyMultiSubmissionDto: ApplyMultiSubmissionDto) {
    const { originId, submissionIds, merge } = applyMultiSubmissionDto;
    const origin = await this.repository.findOneOrFail({ id: originId });
    const submissions = await this.repository.find({
      id: { $in: submissionIds },
    });
    if (merge) {
      // Keeps unique options, overwrites overlapping options\
      // eslint-disable-next-line no-restricted-syntax
      for (const submission of submissions) {
        // eslint-disable-next-line no-restricted-syntax
        for (const option of origin.options.getItems()) {
          const existingOption = submission.options
            .getItems()
            .find((o) => o.account.id === option.account.id);
          if (existingOption) {
            // Don't overwrite set title
            const opts = { ...option.data, title: existingOption.data.title };
            existingOption.data = opts;
          } else {
            submission.options.add(
              await this.websiteOptionsService.createOption(
                submission,
                option.account.id,
                option.data,
                option.isDefault ? undefined : option.data.title,
              ),
            );
          }
        }
      }
    } else {
      // Removes all options not included in the origin submission
      // eslint-disable-next-line no-restricted-syntax
      for (const submission of submissions) {
        const items = submission.options.getItems();
        const defaultOptions = items.find((option) => option.isDefault);
        const defaultTitle = defaultOptions?.data.title;
        submission.options.removeAll();
        // eslint-disable-next-line no-restricted-syntax
        for (const option of origin.options.getItems()) {
          const opts = { ...option.data };
          if (option.isDefault) {
            opts.title = defaultTitle;
          }
          submission.options.add(
            await this.websiteOptionsService.createOption(
              submission,
              option.account.id,
              opts,
              option.isDefault ? defaultTitle : option.data.title,
            ),
          );
        }
      }
    }

    await this.repository.persistAndFlush(submissions);
    this.emit();
  }

  /**
   * Duplicates a submission.
   * !Somewhat janky method of doing a clone.
   * @param {string} id
   */
  public async duplicate(id: string) {
    this.logger.info(`Duplicating Submission '${id}'`);
    const entityToDuplicate = await this.repository.findOne(
      { id },
      { populate: true },
    );

    if (!entityToDuplicate) {
      throw new NotFoundException(`No entity with id '${id}' found`);
    }

    const copy = cloneDeep(
      serialize(entityToDuplicate, {
        populate: true,
        ignoreSerializers: true,
      }),
    );
    copy.id = v4();
    copy.options.forEach((option: WebsiteOptions) => {
      option.id = v4();
      if (option.account.id === NULL_ACCOUNT_ID) {
        option.data.title = `${option.data.title} copy`;
      }
      delete option.submission;
    });
    const metadata = JSON.parse(
      JSON.stringify(copy.metadata),
    ) as FileSubmissionMetadata;
    copy.metadata = metadata;
    copy.files.forEach((fileEntity) => {
      delete fileEntity.submission;
      const oldId = fileEntity.id;
      // Fix metadata
      const index = metadata.order.findIndex(
        (fileId) => fileId === fileEntity.id,
      );
      fileEntity.id = v4();
      if (index > -1) {
        metadata.order[index] = fileEntity.id;
      }

      if (metadata.fileMetadata[oldId]) {
        metadata.fileMetadata[fileEntity.id] = metadata.fileMetadata[oldId];
        delete metadata.fileMetadata[oldId];
      }

      if (fileEntity.altFile) {
        fileEntity.altFile.id = v4();
        delete fileEntity.altFile.parent;
      }

      if (fileEntity.file) {
        fileEntity.file.id = v4();
        delete fileEntity.file.parent;
      }

      if (fileEntity.thumbnail) {
        fileEntity.thumbnail.id = v4();
        delete fileEntity.thumbnail.parent;
      }
    });

    const created = this.repository.create(copy);
    await this.repository.persistAndFlush(created);
    this.emit();
  }

  async updateTemplateName(
    id: string,
    updateSubmissionDto: UpdateSubmissionTemplateNameDto,
  ) {
    const entity = await this.findById(id, { failOnMissing: true });

    const name = updateSubmissionDto.name.trim();
    if (!updateSubmissionDto.name) {
      throw new BadRequestException(
        'Template name cannot be empty or whitespace',
      );
    }

    if (entity.metadata.template) {
      entity.metadata.template.name = name;
      await this.repository.flush();
      return entity;
    }

    throw new BadRequestException(`Submission '${id}' is not a template`);
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
    await this.repository.persistAndFlush(allSubmissions);
    this.emit();
  }

  public findPopulatedById(id: string) {
    return this.repository.findOneOrFail(
      { id },
      { populate: ['options', 'options.account'] },
    );
  }
}
