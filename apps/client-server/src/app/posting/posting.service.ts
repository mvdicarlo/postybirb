import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
    AccountRepository,
    Post,
    PostRepository,
    Submission,
    SubmissionFile,
    SubmissionFileRepository,
    SubmissionRepository,
    UnitOfWork,
    UnitOfWorkRepository,
    WebsiteOptions,
    WebsiteOptionsRepository
} from '@postybirb/database';
import {
    AccountId,
    PostId,
    SubmissionFileId,
    SubmissionId,
    UnitOfWorkState,
} from '@postybirb/types';
import { eq as equals, inArray } from 'drizzle-orm';
import { chunk } from 'lodash';
import { v4 as uuid } from 'uuid';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { PostingManager } from './posting-manager';

export type UnitOfWorkEvictions = Record<AccountId, SubmissionFileId[]>;

export interface IncompleteWork {
    remainingWork: UnitOfWork[];
    removedWork: UnitOfWork[];
    evicted: UnitOfWork[];
}

@Injectable()
export class PostingService {
    protected readonly submissionRepository = new SubmissionRepository();

    protected readonly fileRepository = new SubmissionFileRepository();

    protected readonly unitOfWorkRepository = new UnitOfWorkRepository();

    protected readonly postRepository = new PostRepository();

    protected readonly accountRepository = new AccountRepository();

    protected readonly websiteOptionsRepository = new WebsiteOptionsRepository();

    constructor(
        private readonly postingManager: PostingManager,
        private readonly websiteRegistry: WebsiteRegistryService,
    ) {}

    @Cron(CronExpression.EVERY_SECOND)
    async handlePendingWork(): Promise<void> {
        // Note: Might want to use a new field like "queuedAt" to determine which
        // work is pending instead of relying on the "updatedAt" field, as it may not
        // accurately reflect the state of the work.
        const pendingWork = await this.postRepository.find({
            where: (post, { and, eq }) => and(
                eq(post.completed, false),
                eq(post.cancelled, false),
            ),
            orderBy: (post, { asc }) => asc(post.updatedAt),
            with: {
                unitsOfWork: true,
            },
        });

        for (const post of pendingWork) {
            if (!(await this.areDependenciesCompleted(post.submissionId))) {
                continue;
            }

            const allottedWork = post.unitsOfWork.filter(
                (unit) => !unit.evicted && !unit.isTerminated,
            );
            if (allottedWork.length === 0) {
                await this.completePost(post.id);
                continue;
            }

            // TODO need to work out a filter for the RATE_LIMITED work as it should be retried
            // after a certain amount of time has passed. This will likely be a database that tracks
            // the last known rate limit for each account and the time it was last hit. Then we can filter out any work that is rate limited and has not yet passed the time limit.

            await this.postingManager.submit(post.id);
        }
    }

    public async areDependenciesCompleted(
        submissionId: SubmissionId,
    ): Promise<boolean> {
        const submission = await this.submissionRepository.findByIdOrThrow(
            submissionId,
        );
        const dependencyIds = [...new Set(submission.dependsOn)];
        if (dependencyIds.length === 0) {
            return true;
        }

        const completedDependencyPosts = await this.postRepository.find({
            where: (post, { and, eq, inArray: whereInArray }) => and(
                whereInArray(post.submissionId, dependencyIds),
                eq(post.completed, true),
            ),
        });
        const completedDependencyIds = new Set(
            completedDependencyPosts.map((post) => post.submissionId),
        );
        return dependencyIds.every((dependencyId) =>
            completedDependencyIds.has(dependencyId),
        );
    }

    public async cancelPost(postId: PostId, reason?: string): Promise<void> {
        await Promise.all([
            this.postRepository.update(postId, {
                completed: true,
                cancelled: true,
            }),
            this.postingManager.cancel(postId, reason ?? 'Cancelled by user'),
        ]);
    }

    public async getPost(submissionId: SubmissionId): Promise<Post | null> {
        return this.postRepository.findOne({
            where: (record, { eq }) => eq(record.submissionId, submissionId),
        });
    }

    private async getPotentialWork(submissionId: SubmissionId): Promise<Post> {
        const post = new Post({
            submissionId,
            unitsOfWork: await this.generateUnitsOfWork(submissionId),
            completed: false,
            cancelled: false,
        });
        return post;
    }

    public async getIncompleteWork(
        submissionId: SubmissionId,
        evictions: UnitOfWorkEvictions = {},
    ): Promise<IncompleteWork> {
        // Rebuild the desired account/file targets from the submission's current
        // files and website options, then reconcile them with active persisted work.
        const existingWork = await this.getExistingWork(submissionId);
        const potentialWork = await this.getPotentialWork(submissionId);

        if (!existingWork) {
            // On the first post every generated target is new and needs a batch.
            await this.assignBatches(potentialWork.unitsOfWork);
            return {
                remainingWork: potentialWork.unitsOfWork,
                removedWork: [],
                evicted: [],
            };
        }

        // The composite key identifies the same logical account/file target across
        // generations, allowing active work and its attempt state to be reused.
        const existingByKey = new Map(
            existingWork.unitsOfWork.map((unit) => [unit.compositeKey, unit]),
        );
        const potentialKeys = new Set(
            potentialWork.unitsOfWork.map((unit) => unit.compositeKey),
        );
        // A target becomes removed when current submission data no longer generates
        // it, for example after removing an account/file or changing an ignore list.
        const removedWork = existingWork.unitsOfWork.filter(
            (unit) => !potentialKeys.has(unit.compositeKey),
        );

        // Explicit evictions request a fresh attempt even when the target still
        // exists. This is how callers selectively repost completed or failed work.
        const evicted = existingWork.unitsOfWork.filter((unit) => {
            const fileIds = evictions[unit.accountId];
            if (!fileIds) {
                return false;
            }
            // An empty list means every unit for the account; otherwise only listed files.
            return fileIds.length === 0 || (
                unit.fileId !== undefined && fileIds.includes(unit.fileId)
            );
        });
        const evictedIds = new Set(evicted.map((unit) => unit.id));
        const newWork: UnitOfWork[] = [];

        // Reconcile from the desired targets so removed work cannot leak into the
        // next run. Reuse active matches, replace explicitly evicted matches, and
        // omit unchanged terminated matches because they have no work remaining.
        const remainingWork = potentialWork.unitsOfWork.flatMap((potential) => {
            const existing = existingByKey.get(potential.compositeKey);
            if (!existing || evictedIds.has(existing.id)) {
                newWork.push(potential);
                return [potential];
            }
            return existing.isTerminated ? [] : [existing];
        });

        // Reused rows keep their original batch; only fresh rows are grouped again.
        await this.assignBatches(newWork);

        // post() persists removedWork and evicted as historical rows, while
        // remainingWork is the active work that should exist after reconciliation.
        return {
            remainingWork,
            removedWork,
            evicted,
        };
    }

    public async post(
        submissionId: SubmissionId,
        evictions: UnitOfWorkEvictions = {},
    ): Promise<Post> {
        // Finish all asynchronous generation, account lookup, and batching before
        // opening the synchronous SQLite transaction below.
        const incompleteWork = await this.getIncompleteWork(
            submissionId,
            evictions,
        );

        // A submission owns one Post row. Reposting reopens that row instead of
        // creating a second post and attaches only newly generated units to it.
        const existingPost = await this.getPost(submissionId);
        const post = existingPost ?? new Post({ submissionId });
        // Generated units have no postId until they are attached in the transaction below.
        const newWork = incompleteWork.remainingWork.filter(
            (unit) => !unit.postId,
        );

        // Removed targets and explicit retries follow the same persistence path:
        // retain the old row for history, but exclude it from future scheduling.
        const evictedIds = [
            ...new Set(
                [...incompleteWork.evicted, ...incompleteWork.removedWork]
                    .map((unit) => unit.id),
            ),
        ];

        // Keep historical units as evicted rows and insert their replacements atomically.
        this.postRepository.db.transaction((tx) => {
            if (existingPost) {
                // Reopen completed or cancelled posts now that active work changed.
                tx.update(this.postRepository.table)
                    .set({ completed: false, cancelled: false })
                    .where(equals(this.postRepository.table.id, post.id))
                    .run();
            } else {
                tx.insert(this.postRepository.table)
                    .values({
                        id: post.id,
                        createdAt: post.createdAt,
                        updatedAt: post.updatedAt,
                        submissionId,
                        completed: false,
                        cancelled: false,
                    })
                    .run();
            }

            if (evictedIds.length > 0) {
                // Eviction is a soft delete so prior attempts remain inspectable.
                tx.update(this.unitOfWorkRepository.table)
                    .set({ evicted: true })
                    .where(
                        inArray(this.unitOfWorkRepository.table.id, evictedIds),
                    )
                    .run();
            }

            if (newWork.length > 0) {
                // Fresh units include new targets and replacements for explicit evictions.
                tx.insert(this.unitOfWorkRepository.table)
                    .values(
                        newWork.map((unit) => ({
                            ...unit.toObject(),
                            postId: post.id,
                        })),
                    )
                    .run();
            }
        });

        // Reload so callers receive database values and the complete unit history.
        return this.postRepository.findByIdOrThrow(post.id);
    }

    private async getExistingWork(submissionId: SubmissionId): Promise<Post | undefined> {
        const post = await this.postRepository.findOne({
            where: (record, { eq }) => eq(record.submissionId, submissionId),
            with: {},
        });
        if (!post) {
            return undefined;
        }
        // Previously evicted generations are history and must not participate in reconciliation.
        const unitsOfWork = await this.unitOfWorkRepository.find({
            where: (unit, { and, eq }) => and(
                eq(unit.postId, post.id),
                eq(unit.evicted, false),
            ),
        });
        post.unitsOfWork = unitsOfWork;
        return post;
    }

    private async generateUnitsOfWork(submissionId: SubmissionId): Promise<UnitOfWork[]> {
        const submission = await this.submissionRepository.findByIdOrThrow(submissionId);
        const files = await this.fileRepository.find({
            where: (c, { eq }) => eq(c.submissionId, submissionId),
            orderBy: (file, { asc }) => asc(file.order),
        });
        const websiteOptions = await this.websiteOptionsRepository.find({
            where: (c, { eq }) => eq(c.submissionId, submissionId),
        });

        return websiteOptions.flatMap((option) => {
            if (files.length > 0) {
                return files.map((file) => this.createUnitOfWork(submission, option, file));
            }
            return [this.createUnitOfWork(submission, option)];
        }).filter((uow): uow is UnitOfWork => uow !== undefined);
    }

    private async assignBatches(unitsOfWork: UnitOfWork[]): Promise<void> {
        const workByAccount = new Map<AccountId, UnitOfWork[]>();
        for (const unit of unitsOfWork) {
            const accountWork = workByAccount.get(unit.accountId) ?? [];
            accountWork.push(unit);
            workByAccount.set(unit.accountId, accountWork);
        }

        await Promise.all(
            [...workByAccount.entries()].map(async ([accountId, accountWork]) => {
                const account = await this.accountRepository.findByIdOrThrow(accountId);
                const website = await this.websiteRegistry.ensureInstance(account);
                const batchSize = Math.max(
                    website.decoratedProps.fileOptions?.fileBatchSize ?? 1,
                    1,
                );

                for (const batch of chunk(accountWork, batchSize)) {
                    const batchId = uuid();
                    for (const unit of batch) {
                        unit.batch = batchId;
                    }
                }
            }),
        );
    }

    private createUnitOfWork(submission: Submission, option: WebsiteOptions, file?: SubmissionFile): UnitOfWork | undefined {
        if (file) {
            const { metadata } = file;
            const { ignoredWebsites } = metadata;
            const { accountId } = option;
            // Do not create a unit of work for this account if it is in the ignored websites list
            if (ignoredWebsites.includes(accountId)) {
                return undefined;
            }
        }
        return new UnitOfWork({
            submissionId: submission.id,
            fileId: file?.id,
            fileHash: file?.hash,
            accountId: option.accountId,
            attempt: 0,
            evicted: false,
            state: UnitOfWorkState.NEW,
        });
    }

    private async completePost(postId: PostId): Promise<void> {
        await this.postRepository.update(postId, { completed: true });
    }
}