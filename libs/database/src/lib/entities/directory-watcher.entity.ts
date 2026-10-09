import type {
    DirectoryWatcherDto,
    DirectoryWatcherImportAction,
    IDirectoryWatcher,
    SubmissionId,
} from '@postybirb/types';
import type { InferSelectModel } from 'drizzle-orm';
import { HydrationContext } from '../repositories/base/hydration-context';
import type { DirectoryWatcherSchema } from '../schemas';
import { DatabaseEntity } from './database-entity';
import { Submission, type SubmissionRow } from './submission.entity';

export type DirectoryWatcherRow = InferSelectModel<
  typeof DirectoryWatcherSchema
> & {
  template?: SubmissionRow;
};

export class DirectoryWatcher
  extends DatabaseEntity<IDirectoryWatcher>
  implements IDirectoryWatcher
{
  public readonly entitySchemaKey!: 'DirectoryWatcherSchema';

  public path?: string;

  public templateId: SubmissionId | null;

  public importAction: DirectoryWatcherImportAction;

  public template!: Submission;

  constructor(init: Partial<IDirectoryWatcher> = {}) {
    super(init);
    Object.defineProperty(this, 'entitySchemaKey', {
      value: 'DirectoryWatcherSchema',
      enumerable: false,
      writable: false,
      configurable: false,
    });
    this.path = init.path;
    this.templateId = init.templateId === undefined ? null : init.templateId;
    this.importAction =
      init.importAction ?? ('' as DirectoryWatcherImportAction);
  }

  public toObject(): IDirectoryWatcher {
    return {
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      path: this.path,
      templateId: this.templateId,
      importAction: this.importAction,
      template: this.template,
    };
  }

  public toDTO(): DirectoryWatcherDto {
    const { template, ...rest } = this.toObject();
    return { ...rest, template: template?.id ?? this.templateId };
  }

  static fromRow(
    row: DirectoryWatcherRow,
    ctx: HydrationContext = new HydrationContext(),
  ): DirectoryWatcher {
    return ctx.hydrate('DirectoryWatcherSchema', row, DirectoryWatcher, (e) => {
      if (row.template) e.template = ctx.hydrateOne(Submission, row.template);
    });
  }
}
