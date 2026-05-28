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
  public readonly entitySchemaKey = 'DirectoryWatcherSchema' as const;

  path?: string;

  templateId!: SubmissionId;

  importAction!: DirectoryWatcherImportAction;

  template!: Submission;

  public toObject(): IDirectoryWatcher {
    return { ...this };
  }

  public toDTO(): DirectoryWatcherDto {
    const { template, ...rest } = this.toObject();
    return { ...rest, template: template?.id };
  }

  static fromRow(
    row: DirectoryWatcherRow,
    ctx: HydrationContext = new HydrationContext(),
  ): DirectoryWatcher {
    return ctx.getOrCreate(
      'DirectoryWatcherSchema',
      row.id,
      () => {
        const { template, ...scalars } = row;
        return Object.assign(new DirectoryWatcher(), scalars);
      },
      (e) => {
        if (row.template) e.template = Submission.fromRow(row.template, ctx);
      },
    );
  }

  static fromRows(
    rows: readonly DirectoryWatcherRow[],
    ctx: HydrationContext = new HydrationContext(),
  ): DirectoryWatcher[] {
    return rows.map((r) => DirectoryWatcher.fromRow(r, ctx));
  }
}
