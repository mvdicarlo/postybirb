import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Insert } from '@postybirb/database';
import {
  AccountId,
  Description,
  DescriptionValue,
  DynamicObject,
  EntityId,
  ISubmission,
  ISubmissionMetadata,
  IWebsiteFormFields,
  NULL_ACCOUNT_ID,
  SubmissionId,
  SubmissionMetadataType,
  SubmissionType,
  ValidationResult,
} from '@postybirb/types';
import { AccountService } from '../account/account.service';
import { PostyBirbService } from '../common/service/postybirb-service';
import { Submission, WebsiteOptions } from '../drizzle/models';
import { PostyBirbDatabase } from '../drizzle/postybirb-database/postybirb-database';
import { FormGeneratorService } from '../form-generator/form-generator.service';
import { SubmissionService } from '../submission/services/submission.service';
import { UserSpecifiedWebsiteOptionsService } from '../user-specified-website-options/user-specified-website-options.service';
import { ValidationService } from '../validation/validation.service';
import { DefaultWebsiteOptions } from '../websites/models/default-website-options';
import { CreateWebsiteOptionsDto } from './dtos/create-website-options.dto';
import { UpdateSubmissionWebsiteOptionsDto } from './dtos/update-submission-website-options.dto';
import { UpdateWebsiteOptionsDto } from './dtos/update-website-options.dto';
import { ValidateWebsiteOptionsDto } from './dtos/validate-website-options.dto';

@Injectable()
export class WebsiteOptionsService extends PostyBirbService<'WebsiteOptionsSchema'> {
  private readonly submissionRepository = new PostyBirbDatabase(
    'SubmissionSchema',
  );

  constructor(
    @Inject(forwardRef(() => SubmissionService))
    private readonly submissionService: SubmissionService,
    private readonly accountService: AccountService,
    private readonly userSpecifiedOptionsService: UserSpecifiedWebsiteOptionsService,
    private readonly formGeneratorService: FormGeneratorService,
    private readonly validationService: ValidationService,
  ) {
    super(
      new PostyBirbDatabase('WebsiteOptionsSchema', {
        account: true,
        submission: true,
      }),
    );

    this.repository.subscribe('CustomShortcutSchema', (ids, action) => {
      if (action === 'delete') {
        for (const id of ids) {
          this.onCustomShortcutDelete(id).catch((err) =>
            this.logger.error(
              `Error handling custom shortcut delete for id '${id}': ${err.message}`,
              err.stack,
            ),
          );
        }
      }
    });
  }

  /**
   * Creates a submission option for a submission.
   * No longer remember why this is a separate method from create.
   *
   * @param {ISubmission} submission
   * @param {AccountId} accountId
   * @param {DynamicObject} data
   * @param {string} [title]
   * @return {*}  {Promise<WebsiteOptions>}
   */
  async createOption(
    submission: ISubmission,
    accountId: AccountId,
    data: DynamicObject,
    title?: string,
  ): Promise<WebsiteOptions> {
    const option = await this.createOptionInsertObject(
      submission,
      accountId,
      data,
      title,
    );
    return this.repository.insert(option);
  }

  /**
   * Creates a submission option for a submission.
   *
   * @param {Submission} submission
   * @param {AccountId} accountId
   * @param {DynamicObject} data
   * @param {string} [title]
   */
  async createOptionInsertObject(
    submission: ISubmission,
    accountId: AccountId,
    data: DynamicObject,
    title?: string,
  ): Promise<Insert<'WebsiteOptionsSchema'>> {
    const account = await this.accountService.findById(accountId, {
      failOnMissing: true,
    });
    const isDefault = accountId === NULL_ACCOUNT_ID;

    const userDefinedDefaultOptions =
      await this.userSpecifiedOptionsService.findByAccountAndSubmissionType(
        accountId,
        submission.type,
      );

    const formFields = isDefault
      ? await this.formGeneratorService.getDefaultForm(submission.type)
      : await this.formGeneratorService.generateForm({
          accountId: account.id,
          type: submission.type,
        });

    // Populate with the form fields to get the default values
    const websiteData: IWebsiteFormFields = {
      ...Object.entries(formFields).reduce(
        (acc, [key, field]) => ({
          ...acc,
          [key]: field.defaultValue,
        }),
        {} as IWebsiteFormFields,
      ),
    };

    const mergedData: IWebsiteFormFields = {
      ...(isDefault ? new DefaultWebsiteOptions() : {}), // Only merge default options if this is the default option
      ...websiteData, // Merge default form fields
      ...(userDefinedDefaultOptions?.options ?? {}), // Merge user defined options
      ...data, // Merge user defined data
      title, // Override title (optional)
    };

    const option: Insert<'WebsiteOptionsSchema'> = {
      submissionId: submission.id,
      accountId: account.id,
      data: mergedData,
      isDefault,
    };

    return option;
  }

  /**
   * The default create method for WebsiteOptions.
   * Performs user saved options and other merging operations.
   * Performs and update if it already exists.
   *
   * @param {CreateWebsiteOptionsDto} createDto
   * @return {*}
   */
  async create(createDto: CreateWebsiteOptionsDto) {
    const account = await this.accountService.findById(createDto.accountId, {
      failOnMissing: true,
    });

    let submission: ISubmission<SubmissionMetadataType>;
    try {
      submission = await this.submissionRepository.findById(
        createDto.submissionId,
        { failOnMissing: true },
      );
    } catch (err) {
      throw new NotFoundException(
        `Submission ${createDto.submissionId} not found.`,
      );
    }

    const exists = await this.repository.findOne({
      where: (wo, { and, eq }) =>
        and(eq(wo.submissionId, submission.id), eq(wo.accountId, account.id)),
    });
    if (exists) {
      // Opt to just update the existing option
      return this.update(exists.id, { data: createDto.data });
    }

    const formFields =
      account.id === NULL_ACCOUNT_ID
        ? await this.formGeneratorService.getDefaultForm(submission.type)
        : await this.formGeneratorService.generateForm({
            accountId: account.id,
            type: submission.type,
          });
    // Populate with the form fields to get the default values
    const websiteData: IWebsiteFormFields = {
      ...Object.entries(formFields).reduce(
        (acc, [key, field]) => ({
          ...acc,
          [key]:
            createDto.data?.[key as keyof IWebsiteFormFields] === undefined
              ? field.defaultValue
              : createDto.data?.[key as keyof IWebsiteFormFields],
        }),
        {} as IWebsiteFormFields,
      ),
    };

    const record = await this.repository.insert({
      submissionId: submission.id,
      data: websiteData,
      accountId: account.id,
      isDefault: account.id === NULL_ACCOUNT_ID,
    });
    this.submissionService.emit();
    return record;
  }

  async update(id: EntityId, update: UpdateWebsiteOptionsDto) {
    this.logger.withMetadata(update).info(`Updating WebsiteOptions '${id}'`);
    const result = await this.repository.update(id, update);
    this.submissionService.emit();
    return result;
  }

  /**
   * Creates the default submission option that stores shared data
   * across multiple submission options.
   *
   * @param {Submission<ISubmissionMetadata>} submission
   * @param {string} title
   * @param {Partial<IWebsiteFormFields>} [defaultOptions] - Optional default options to merge
   * @return {*}  {Promise<WebsiteOptions>}
   */
  async createDefaultSubmissionOptions(
    submission: ISubmission<ISubmissionMetadata>,
    title: string,
    defaultOptions?: Partial<IWebsiteFormFields>,
  ): Promise<WebsiteOptions> {
    this.logger
      .withMetadata({ id: submission.id })
      .info('Creating Default Website Options');

    const options: Insert<'WebsiteOptionsSchema'> = {
      isDefault: true,
      submissionId: submission.id,
      accountId: NULL_ACCOUNT_ID,
      data: await this.populateDefaultWebsiteOptions(
        NULL_ACCOUNT_ID,
        submission.type,
        title,
        defaultOptions,
      ),
    };

    return this.repository.insert(options);
  }

  private async populateDefaultWebsiteOptions(
    accountId: AccountId,
    type: SubmissionType,
    title?: string,
    defaultOptions?: Partial<IWebsiteFormFields>,
  ): Promise<IWebsiteFormFields> {
    const userSpecifiedOptions =
      (
        await this.userSpecifiedOptionsService.findByAccountAndSubmissionType(
          NULL_ACCOUNT_ID,
          type,
        )
      )?.options ?? {};

    const websiteFormFields: IWebsiteFormFields = {
      ...new DefaultWebsiteOptions(),
      ...userSpecifiedOptions,
      title,
    };

    // Merge provided default options (tags, description, rating)
    if (defaultOptions) {
      if (defaultOptions.tags) {
        websiteFormFields.tags = {
          overrideDefault: false,
          tags: defaultOptions.tags.tags ?? defaultOptions.tags.tags ?? [],
        };
      }
      if (defaultOptions.description) {
        websiteFormFields.description = defaultOptions.description;
      }
      if (defaultOptions.rating) {
        websiteFormFields.rating = defaultOptions.rating;
      }
    }

    return websiteFormFields;
  }

  /**
   * Validates a submission option against a website instance.
   * @param {ValidateWebsiteOptionsDto} validate
   * @return {Promise<ValidationResult>}
   */
  async validateWebsiteOption(
    validate: ValidateWebsiteOptionsDto,
  ): Promise<ValidationResult> {
    const { websiteOptionId, submissionId } = validate;
    const submission = await this.submissionService.findById(submissionId, {
      failOnMissing: true,
    });
    const websiteOption = submission.options.find(
      (option) => option.id === websiteOptionId,
    );
    return this.validationService.validate(submission, websiteOption);
  }

  /**
   * Validates all submission options for a submission.
   * Accepts either a submission ID (will fetch from DB) or a Submission object directly.
   * When a Submission object is provided, it avoids a redundant database query.
   * @param {SubmissionId | Submission} submissionOrId
   * @return {*}  {Promise<ValidationResult[]>}
   */
  async validateSubmission(
    submissionOrId: SubmissionId | Submission,
  ): Promise<ValidationResult[]> {
    const submission =
      typeof submissionOrId === 'string'
        ? await this.submissionService.findById(submissionOrId)
        : submissionOrId;
    return this.validationService.validateSubmission(submission);
  }

  async updateSubmissionOptions(
    submissionId: SubmissionId,
    updateDto: UpdateSubmissionWebsiteOptionsDto,
  ) {
    const submission = await this.submissionService.findById(submissionId, {
      failOnMissing: true,
    });

    const { remove, add } = updateDto;
    if (remove?.length) {
      const items = submission.options;
      const removableIds = [];
      for (const id of remove) {
        const option = items.find((opt) => opt.id === id);
        if (option) {
          removableIds.push(id);
        }
      }
      this.logger.debug(
        `Removing option(s) [${removableIds.join(', ')}] from submission ${submissionId}`,
      );
      await this.repository.deleteById(removableIds);
    }

    if (add?.length) {
      const options = await Promise.all(
        add.map((dto) =>
          this.createOptionInsertObject(submission, dto.accountId, dto.data),
        ),
      );
      await this.repository.insert(options);
    }

    this.submissionService.emit();
    return this.submissionService.findById(submissionId);
  }

  private async onCustomShortcutDelete(id: EntityId) {
    const websiteOptions = await this.findAll();
    for (const option of websiteOptions) {
      const { data } = option;
      const descValue: DescriptionValue | undefined = data?.description;
      const blocks: Description | undefined = descValue?.description;

      if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
        continue;
      }

      const { changed, filtered } = this.filterCustomShortcut(
        blocks,
        String(id),
      );
      if (changed) {
        const updatedDescription: DescriptionValue = {
          ...(descValue as DescriptionValue),
          description: filtered,
        };

        await this.repository.update(option.id, {
          data: {
            ...data,
            description: updatedDescription,
          },
        });
        this.submissionService.emit();
      }
    }
  }

  /**
   * Removes inline customShortcut items matching the given id from a Description document.
   * Simple recursive filter without whitespace normalization.
   */
  public filterCustomShortcut(
    blocks: Description,
    deleteId: string,
  ): {
    changed: boolean;
    filtered: Description;
  } {
    let changed = false;

    const isObject = (v: unknown): v is Record<string, unknown> =>
      typeof v === 'object' && v !== null;

    const filterInline = (content: unknown[]): unknown[] => {
      const out: unknown[] = [];
      for (const node of content) {
        if (!isObject(node)) {
          out.push(node);
          continue;
        }

        const {
          type,
          props,
          content: nodeContent,
        } = node as {
          type?: string;
          props?: Record<string, unknown>;
          content?: unknown[];
        };

        if (type === 'customShortcut' && String(props?.id ?? '') === deleteId) {
          changed = true;
          continue; // drop this inline
        }

        // Recurse if this inline node has its own content
        if (Array.isArray(nodeContent)) {
          const clone = { ...node } as Record<string, unknown> & {
            content?: unknown[];
          };
          clone.content = filterInline(nodeContent);
          out.push(clone);
        } else {
          out.push(node);
        }
      }
      return out;
    };

    const filterBlocks = (arr: Description): Description =>
      arr.map((blk) => {
        const clone: typeof blk = { ...blk } as typeof blk & {
          content?: unknown[];
          children?: unknown;
        };
        if (Array.isArray(clone.content)) {
          (clone as unknown as { content: unknown[] }).content = filterInline(
            clone.content,
          );
        }
        if (Array.isArray(clone.children)) {
          (clone as unknown as { children: Description }).children =
            filterBlocks(clone.children as unknown as Description);
        }
        return clone;
      });

    const filtered = filterBlocks(blocks);
    return { changed, filtered };
  }
}
