import { Injectable } from '@nestjs/common';
import {
    AccountSchema,
    backupDatabaseBeforeDataMigration,
    getDatabase,
    SubmissionSchema,
    WebsiteOptionsSchema,
} from '@postybirb/database';
import { Logger } from '@postybirb/logger';
import { IWebsiteFormFields, NULL_ACCOUNT_ID } from '@postybirb/types';
import {
    and,
    asc,
    count,
    eq,
    gt,
    inArray,
    lt,
    not,
    SQL,
    sql,
} from 'drizzle-orm';
import { isPlainObject } from 'lodash';
import { SubmissionEventPublisher } from '../submission/submission-event.publisher';
import { WebsiteOptionsMigration } from '../websites/decorators/migrate-website-options.decorator';
import {
    WebsiteOptionsModelDefinition,
    WebsiteRegistryService,
} from '../websites/website-registry.service';

export interface WebsiteOptionsMigrationSummary {
  updated: number;
  advanced: number;
  failed: number;
  futureVersions: number;
}

const PAGE_SIZE = 200;

@Injectable()
export class WebsiteOptionsMigrationService {
  private readonly db = getDatabase();

  private readonly logger = Logger(WebsiteOptionsMigrationService.name);

  private backedUp = false;

  constructor(
    private readonly websiteRegistry: WebsiteRegistryService,
    private readonly submissionEventPublisher: SubmissionEventPublisher,
  ) {}

  public async runPendingMigrations(): Promise<WebsiteOptionsMigrationSummary> {
    const summary: WebsiteOptionsMigrationSummary = {
      updated: 0,
      advanced: 0,
      failed: 0,
      futureVersions: 0,
    };
    const definitions = await this.websiteRegistry
      .getOptionModelDefinitions()
      .catch((error) => {
        summary.failed++;
        this.logger
          .withError(error)
          .error('Failed to discover option migrations');
        return [];
      });
    for (const definition of definitions) {
      // Undecorated models require no migration-related database queries.
      if (!definition.migrations.length) {
        continue;
      }
      try {
        const scope = this.getScope(definition);
        const latestVersion = definition.migrations.at(-1)?.version ?? 0;
        const futureVersions =
          this.db
            .select({ count: count() })
            .from(WebsiteOptionsSchema)
            .where(
              and(
                scope,
                gt(WebsiteOptionsSchema.migrationVersion, latestVersion),
              ),
            )
            .get()?.count ?? 0;
        if (futureVersions) {
          summary.futureVersions += futureVersions;
          this.logger.warn(
            `Skipping ${futureVersions} newer option version(s) for ${definition.website}/${definition.type}`,
          );
        }
        const pending = this.db
          .select({ id: WebsiteOptionsSchema.id })
          .from(WebsiteOptionsSchema)
          .where(
            and(
              scope,
              lt(WebsiteOptionsSchema.migrationVersion, latestVersion),
            ),
          )
          .limit(1)
          .get();
        if (!pending) {
          continue;
        }
        // Request one backup before changes, shared across models and bundles.
        if (!this.backedUp) {
          backupDatabaseBeforeDataMigration();
          this.backedUp = true;
        }
        // Finish each bundle, including version-only advances, before the next.
        // Later predicates therefore see the data produced by earlier bundles.
        for (const migration of definition.migrations) {
          const result = this.runBundle(definition, migration, scope);
          summary.updated += result.updated;
          summary.advanced += result.advanced;
          summary.failed += result.failed;
        }
      } catch (error) {
        summary.failed++;
        this.logger
          .withError(error)
          .error(
            `Failed to migrate option scope ${definition.website}/${definition.type}`,
          );
      }
    }
    if (summary.updated || summary.advanced || summary.failed) {
      this.logger
        .withMetadata(summary)
        .info('Website option migrations finished');
    }
    return summary;
  }

  private getScope(definition: WebsiteOptionsModelDefinition): SQL | undefined {
    // Histories are separate per website/type; include templates and archives.
    const accountScope =
      definition.website === NULL_ACCOUNT_ID
        ? eq(WebsiteOptionsSchema.accountId, NULL_ACCOUNT_ID)
        : inArray(
            WebsiteOptionsSchema.accountId,
            this.db
              .select({ id: AccountSchema.id })
              .from(AccountSchema)
              .where(eq(AccountSchema.website, definition.website)),
          );
    return and(
      accountScope,
      eq(
        WebsiteOptionsSchema.isDefault,
        definition.website === NULL_ACCOUNT_ID,
      ),
      inArray(
        WebsiteOptionsSchema.submissionId,
        this.db
          .select({ id: SubmissionSchema.id })
          .from(SubmissionSchema)
          .where(eq(SubmissionSchema.type, definition.type)),
      ),
    );
  }

  private runBundle(
    definition: WebsiteOptionsModelDefinition,
    migration: WebsiteOptionsMigration,
    scope: SQL | undefined,
  ): Pick<WebsiteOptionsMigrationSummary, 'updated' | 'advanced' | 'failed'> {
    const summary = { updated: 0, advanced: 0, failed: 0 };
    // Requiring N - 1 prevents a record from skipping an earlier failed bundle.
    const previousVersion = eq(
      WebsiteOptionsSchema.migrationVersion,
      migration.version - 1,
    );
    // SQL NULL counts as a nonmatch and takes the version-only path below.
    const predicate = migration.where
      ? sql`coalesce((${migration.where({ data: WebsiteOptionsSchema.data })}), 0)`
      : undefined;
    // Use stable IDs: successful writes remove rows from the pending set,
    // so offset pagination would skip records. The cursor also moves past failures.
    let cursor: string | undefined;
    let hasMore = true;
    while (hasMore) {
      const rows = this.db
        .select({
          id: WebsiteOptionsSchema.id,
          submissionId: WebsiteOptionsSchema.submissionId,
          data: WebsiteOptionsSchema.data,
        })
        .from(WebsiteOptionsSchema)
        .where(
          and(
            scope,
            previousVersion,
            predicate,
            cursor ? gt(WebsiteOptionsSchema.id, cursor) : undefined,
          ),
        )
        .orderBy(asc(WebsiteOptionsSchema.id))
        .limit(PAGE_SIZE)
        .all();
      if (!rows.length) {
        break;
      }
      hasMore = rows.length === PAGE_SIZE;
      const changedSubmissions = new Set<string>();
      for (const row of rows) {
        cursor = row.id;
        try {
          // Commit data and progress together; a failure leaves both untouched.
          const result = this.db.transaction((tx) => {
            const original = JSON.stringify(row.data);
            const migrated = migration.migrate({
              ...structuredClone(row.data),
            });
            if (!isPlainObject(migrated)) {
              throw new Error('An option migration must return a JSON object');
            }
            const serialized = JSON.stringify(migrated);
            const changed = serialized !== original;
            const write = tx
              .update(WebsiteOptionsSchema)
              .set({
                migrationVersion: migration.version,
                ...(changed
                  ? { data: JSON.parse(serialized) as IWebsiteFormFields }
                  : { updatedAt: WebsiteOptionsSchema.updatedAt }),
              })
              .where(and(eq(WebsiteOptionsSchema.id, row.id), previousVersion))
              .run();
            return { changed, written: write.changes > 0 };
          });
          if (result.written) {
            if (result.changed) {
              summary.updated++;
              changedSubmissions.add(row.submissionId);
            } else {
              summary.advanced++;
            }
          }
        } catch (error) {
          // Keep the last successful stamp for retry on the next startup.
          summary.failed++;
          this.logger
            .withError(error)
            .error(
              `Failed option '${row.id}' migration ${definition.website}/${definition.type} v${migration.version} (${migration.name})`,
            );
        }
      }
      // Refresh clients only for committed data changes, not stamp-only updates.
      if (changedSubmissions.size) {
        this.submissionEventPublisher.markChanged([...changedSubmissions]);
      }
    }
    if (predicate) {
      // Nonmatches also complete this bundle, without loading their JSON.
      // The previous-version check still prevents bypassing any earlier bundle.
      summary.advanced += this.db
        .update(WebsiteOptionsSchema)
        .set({
          migrationVersion: migration.version,
          updatedAt: WebsiteOptionsSchema.updatedAt,
        })
        .where(and(scope, previousVersion, not(predicate)))
        .run().changes;
    }
    return summary;
  }
}
