import { ConflictException, Inject, Injectable, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
    WebsiteOptionsRepository,
} from '@postybirb/database';
import { Logger, PostyBirbLogger } from '@postybirb/logger';
import {
    AccountId,
    PostId,
    ScheduleType,
    SubmissionFileId,
    SubmissionId,
    UnitOfWorkState,
} from '@postybirb/types';
import { IsTestEnvironment } from '@postybirb/utils/common';
import { Cron as CronGenerator } from 'croner';
import { and as allOf, eq as equals, inArray } from 'drizzle-orm';
import { chunk, groupBy } from 'lodash';
import { v4 as uuid } from 'uuid';
import { publishSubmissionProjectionChanged } from '../submission/submission.events';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { PostingManager } from './posting-manager';
import { PostingRateLimiterService } from './posting-rate-limiter.service';
import {
    isUnitOfWorkAttemptSettled,
    selectExecutableWork,
} from './unit-of-work-rate-limit';


export type UnitOfWorkEvictions = Record<AccountId, SubmissionFileId[]>;

export interface IncompleteWork {
    remainingWork: UnitOfWork[];
    removedWork: UnitOfWork[];
    evicted: UnitOfWork[];
}

export interface PostingDryRun extends IncompleteWork {
    paused: boolean;
    dependenciesCompleted: boolean;
    executableWork: UnitOfWork[];
    deferredWork: UnitOfWork[];
}

@Injectable()
export class PostingService {
    private readonly logger: PostyBirbLogger = Logger(PostingService.name);

    protected readonly submissionRepository = new SubmissionRepository();

    protected readonly fileRepository = new SubmissionFileRepository();

    protected readonly unitOfWorkRepository = new UnitOfWorkRepository();

    protected readonly postRepository = new PostRepository();

    protected readonly accountRepository = new AccountRepository();

    protected readonly websiteOptionsRepository = new WebsiteOptionsRepository();

    // Prevents the app from posting until the startup lock expires to allow
    // users to cancel or modify submissions before posting begins.
    protected startupLock = Date.now() + 2 * 60 * 1000; // 2 minutes

    protected postsPaused = false;

    constructor(
        private readonly postingManager: PostingManager,
        private readonly websiteRegistry: WebsiteRegistryService,
        private readonly postingRateLimiter: PostingRateLimiterService,
        @Optional()
        @Inject(EventEmitter2)
        private readonly eventEmitter?: EventEmitter2,
    ) { }

    public arePostsPaused(): boolean {
        return this.postsPaused || Date.now() < this.startupLock;
    }

    public unpausePosts(): void {
        this.postsPaused = false;
        this.startupLock = 0;
    }

    @Cron(CronExpression.EVERY_30_SECONDS)
    async handleScheduledSubmissions(): Promise<void> {
        if (IsTestEnvironment()) {
            return;
        }

        if (this.arePostsPaused()) {
            return;
        }

        const scheduledSubmissions = await this.submissionRepository.find({
            where: (submission, { and, eq }) =>
                and(
                    eq(submission.isScheduled, true),
                    eq(submission.isInitialized, true),
                    eq(submission.isArchived, false)
                ),
            with: {
                post: true
            }
        });

        const now = Date.now();
        const eligibleSubmissions = scheduledSubmissions
            .filter((submission) => !submission.post || submission.post.completed)
            .filter((e) =>
                e.schedule.scheduledFor &&
                new Date(e.schedule.scheduledFor).getTime() <= now,
            )
            .sort((a, b) => new Date(a.schedule.scheduledFor ?? 0).getTime() - new Date(b.schedule.scheduledFor ?? 0).getTime());

        for (const submission of eligibleSubmissions) {
            const { schedule } = submission;
            const { scheduleType } = schedule;

            if (scheduleType === ScheduleType.SINGLE) {
                await this.scheduleSingleTypeSubmission(submission);
                publishSubmissionProjectionChanged(
                    this.eventEmitter,
                    submission.id,
                );
                continue;
            }

            if (scheduleType === ScheduleType.RECURRING) {
                await this.scheduleRecurringTypeSubmission(submission);
                publishSubmissionProjectionChanged(
                    this.eventEmitter,
                    submission.id,
                );
                continue;
            }

            this.logger.warn(
                `Submission '${submission.id}' has an unrecognized schedule type: ${scheduleType}`,
            );
        }
    }

    public async scheduleRecurringTypeSubmission(submission: Submission): Promise<void> {
        if (this.arePostsPaused()) {
            return;
        }

        try {
            this.logger.info(`Scheduling recurring submission '${submission.id}'`);
            const { schedule } = submission;
            const next = schedule.cron
                ? CronGenerator(schedule.cron).nextRun()?.toISOString()
                : undefined;

            await this.postRecurringSubmission(submission.id);

            if (schedule.cron) {
                if (!next) {
                    await this.submissionRepository.update(submission.id, { isScheduled: false });
                } else {
                    await this.submissionRepository.update(submission.id, { schedule: { ...schedule, scheduledFor: next } });
                }
            } else {
                await this.submissionRepository.update(submission.id, { isScheduled: false });
            }

            this.logger
                .withMetadata(submission.schedule)
                .info(`Scheduled submission '${submission.id}'`);
        } catch (error) {
            this.logger
                .withError(error)
                .error(`Unable to post scheduled submission '${submission.id}'`);
        }
    }

    public async scheduleSingleTypeSubmission(submission: Submission): Promise<void> {
        if (this.arePostsPaused()) {
            return;
        }

        try {
            this.logger.info(`Scheduling single submission '${submission.id}'`);
            await this.post(submission.id);
            await this.submissionRepository.update(submission.id, { isScheduled: false });
            this.logger
                .withMetadata(submission.schedule)
                .info(`Scheduled submission '${submission.id}'`);
        } catch (error) {
            this.logger
                .withError(error)
                .error(`Unable to post scheduled submission '${submission.id}'`);
        }
    }

    private async postRecurringSubmission(
        submissionId: SubmissionId,
    ): Promise<Post> {
        const existingPost = await this.getPost(submissionId);
        const evictions: UnitOfWorkEvictions = {};
        for (const unit of existingPost?.unitsOfWork ?? []) {
            if (!unit.evicted) {
                evictions[unit.accountId] = [];
            }
        }
        return this.post(submissionId, evictions);
    }

    @Cron(CronExpression.EVERY_SECOND)
    async handlePendingWork(): Promise<void> {
        if (this.arePostsPaused()) {
            return;
        }

        try {
            await this.postingRateLimiter.initialize();
        } catch (error) {
            // Skip the tick entirely; posting without hydrated reservations risks duplicates.
            this.logger
                .withError(error)
                .error('Unable to hydrate posting rate limits');
            return;
        }

        const pendingWork = await this.postRepository.find({
            where: (post, { and, eq }) =>
                and(eq(post.completed, false), eq(post.cancelled, false)),
            orderBy: (post, { asc }) => asc(post.updatedAt),
            with: {
                unitsOfWork: true,
            },
        });

        for (const post of pendingWork) {
            try {
                await this.submitWhenExecutable(post);
            } catch (error) {
                // Leave the post queued so it cannot starve the posts behind it.
                this.logger
                    .withError(error)
                    .error(`Unable to process pending work for post '${post.id}'`);
            }
        }
    }

    private async submitWhenExecutable(post: Post): Promise<void> {
        if (!(await this.areDependenciesCompleted(post.submissionId))) {
            return;
        }

        const allottedWork = post.unitsOfWork.filter(
            (unit) => !unit.evicted && !isUnitOfWorkAttemptSettled(unit),
        );
        if (allottedWork.length === 0) {
            if (await this.postRepository.completeIfAllActiveUnitsSettled(post.id)) {
                publishSubmissionProjectionChanged(
                    this.eventEmitter,
                    post.submissionId,
                );
            }
            return;
        }

        const executable = await selectExecutableWork(allottedWork, (accountId) =>
            this.acceptsExternalSourceUrls(accountId),
        );
        if (executable.length > 0) {
            await this.postingManager.submit(post.id);
        }
    }

    public async areDependenciesCompleted(
        submissionId: SubmissionId,
    ): Promise<boolean> {
        const submission =
            await this.submissionRepository.findByIdOrThrow(submissionId);
        const dependencyIds = [...new Set(submission.dependsOn)];
        if (dependencyIds.length === 0) {
            return true;
        }

        const completedDependencyPosts = await this.postRepository.find({
            where: (post, { and, eq, inArray: whereInArray }) =>
                and(
                    whereInArray(post.submissionId, dependencyIds),
                    eq(post.completed, true),
                    eq(post.cancelled, false),
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
        const post = await this.postRepository.findById(postId);
        await Promise.all([
            this.postRepository.cancel(postId),
            this.postingManager.cancel(postId, reason ?? 'Cancelled by user'),
        ]);
        if (post) {
            publishSubmissionProjectionChanged(
                this.eventEmitter,
                post.submissionId,
            );
        }
    }

    private async acceptsExternalSourceUrls(
        accountId: AccountId,
    ): Promise<boolean> {
        const account = await this.accountRepository.findByIdOrThrow(accountId);
        return (
            this.websiteRegistry.findInstance(account)?.decoratedProps.fileOptions
                ?.acceptsExternalSourceUrls ?? false
        );
    }

    public async getPost(submissionId: SubmissionId): Promise<Post | null> {
        return this.postRepository.findOne({
            where: (record, { eq }) => eq(record.submissionId, submissionId),
        });
    }

    public async getIncompleteWork(
        submissionId: SubmissionId,
        evictions: UnitOfWorkEvictions = {},
    ): Promise<IncompleteWork> {
        // Rebuild the desired account/file targets from the submission's current
        // files and website options, then reconcile them with active persisted work.
        const existingWork = await this.getExistingWork(submissionId);
        const potentialWork = await this.generateUnitsOfWork(submissionId);

        if (!existingWork) {
            // On the first post every generated target is new and needs a batch.
            await this.assignBatches(potentialWork);
            return {
                remainingWork: potentialWork,
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
            potentialWork.map((unit) => unit.compositeKey),
        );
        // A target becomes removed when current submission data no longer generates
        // it, for example after removing an account/file or changing an ignore list.
        const removedWork = existingWork.unitsOfWork.filter(
            (unit) => !potentialKeys.has(unit.compositeKey),
        );

        // Explicit evictions request a fresh unit. Other non-succeeded work,
        // including failed units, is reused and staged as pending by post().
        const evicted = existingWork.unitsOfWork.filter((unit) => {
            const fileIds = evictions[unit.accountId];
            if (!fileIds) return false;
            // An empty list means every unit for the account; otherwise only listed files.
            return (
                fileIds.length === 0 ||
                (unit.fileId !== undefined && fileIds.includes(unit.fileId))
            );
        });
        const evictedIds = new Set(evicted.map((unit) => unit.id));
        const newWork: UnitOfWork[] = [];

        // Reconcile from the desired targets so removed work cannot leak into the
        // next run. Reuse active matches, replace explicitly evicted matches, and
        // omit unchanged terminated matches because they have no work remaining.
        const remainingWork = potentialWork.flatMap((potential) => {
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

    /**
     * Reports what `post()` would schedule, and which of it the next cycle
     * would actually run, without persisting anything.
     */
    public async dryRun(
        submissionId: SubmissionId,
        evictions: UnitOfWorkEvictions = {},
    ): Promise<PostingDryRun> {
        const work = await this.getIncompleteWork(submissionId, evictions);
        const dependenciesCompleted =
            await this.areDependenciesCompleted(submissionId);
        const executableWork = dependenciesCompleted
            ? await selectExecutableWork(work.remainingWork, (accountId) =>
                this.acceptsExternalSourceUrls(accountId),
            )
            : [];
        const executableIds = new Set(executableWork.map((unit) => unit.id));

        return {
            ...work,
            paused: this.arePostsPaused(),
            dependenciesCompleted,
            executableWork,
            deferredWork: work.remainingWork.filter(
                (unit) => !executableIds.has(unit.id),
            ),
        };
    }

    public async post(
        submissionId: SubmissionId,
        evictions: UnitOfWorkEvictions = {},
    ): Promise<Post> {
        const existingPost = await this.getPost(submissionId);
        if (existingPost && !existingPost.completed) {
            throw new ConflictException(
                `Post '${existingPost.id}' is currently active`,
            );
        }

        // Disable the startup lock after the first post to allow
        // subsequent posts to run immediately.
        // This allows users users to cancel the lock by submitting.
        this.startupLock = Date.now() - 1_000;
        return this.persistPost(submissionId, evictions, existingPost);
    }

    private async persistPost(
        submissionId: SubmissionId,
        evictions: UnitOfWorkEvictions,
        existingPost: Post | null,
    ): Promise<Post> {
        // Finish all asynchronous generation, account lookup, and batching before
        // opening the synchronous SQLite transaction below.
        const incompleteWork = await this.getIncompleteWork(
            submissionId,
            evictions,
        );

        // A submission owns one Post row. Reposting reopens that row instead of
        // creating a second post and attaches only newly generated units to it.
        const post = existingPost ?? new Post({ submissionId });
        // Generated units have no postId until they are attached in the transaction below.
        const newWork = incompleteWork.remainingWork.filter((unit) => !unit.postId);
        const reusedWorkIds = incompleteWork.remainingWork
            .filter((unit) => unit.postId)
            .map((unit) => unit.id);

        // Removed targets and explicit retries follow the same persistence path:
        // retain the old row for history, but exclude it from future scheduling.
        const evictedIds = [
            ...new Set(
                [...incompleteWork.evicted, ...incompleteWork.removedWork].map(
                    (unit) => unit.id,
                ),
            ),
        ];

        // Keep historical units as evicted rows and insert their replacements atomically.
        this.postRepository.db.transaction((tx) => {
            if (existingPost) {
                // Reopen completed or cancelled posts now that active work changed.
                const claimed = tx
                    .update(this.postRepository.table)
                    .set({ completed: false, cancelled: false })
                    .where(
                        allOf(
                            equals(this.postRepository.table.id, post.id),
                            equals(this.postRepository.table.completed, true),
                        ),
                    )
                    .run();
                if (claimed.changes === 0) {
                    throw new ConflictException(`Post '${post.id}' is currently active`);
                }
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
                    .where(inArray(this.unitOfWorkRepository.table.id, evictedIds))
                    .run();
            }

            if (reusedWorkIds.length > 0) {
                tx.update(this.unitOfWorkRepository.table)
                    .set({ state: UnitOfWorkState.PENDING })
                    .where(inArray(this.unitOfWorkRepository.table.id, reusedWorkIds))
                    .run();
            }

            if (newWork.length > 0) {
                // Fresh units include new targets and replacements for prior attempts.
                tx.insert(this.unitOfWorkRepository.table)
                    .values(
                        newWork.map((unit) => ({
                            ...unit.toObject(),
                            postId: post.id,
                            state: UnitOfWorkState.PENDING,
                        })),
                    )
                    .run();
            }
        });

        publishSubmissionProjectionChanged(this.eventEmitter, submissionId);

        // Reload so callers receive database values and the complete unit history.
        return this.postRepository.findByIdOrThrow(post.id);
    }

    private async getExistingWork(
        submissionId: SubmissionId,
    ): Promise<Post | undefined> {
        const post = await this.postRepository.findOne({
            where: (record, { eq }) => eq(record.submissionId, submissionId),
            // Skips the default eager load; units are fetched below without history.
            with: {},
        });
        if (!post) {
            return undefined;
        }
        // Previously evicted generations are history and must not participate in reconciliation.
        post.unitsOfWork = await this.unitOfWorkRepository.find({
            where: (unit, { and, eq }) =>
                and(eq(unit.postId, post.id), eq(unit.evicted, false)),
        });
        return post;
    }

    private async generateUnitsOfWork(
        submissionId: SubmissionId,
    ): Promise<UnitOfWork[]> {
        const submission =
            await this.submissionRepository.findByIdOrThrow(submissionId);
        const files = await this.fileRepository.find({
            where: (c, { eq }) => eq(c.submissionId, submissionId),
            orderBy: (file, { asc }) => asc(file.order),
        });
        const websiteOptions = await this.websiteOptionsRepository.find({
            where: (c, { eq }) => eq(c.submissionId, submissionId),
        });

        return websiteOptions.flatMap((option) => {
            if (files.length === 0) {
                return [this.createUnitOfWork(submission, option)];
            }
            // A file opts an account out of posting via its ignored websites list.
            return files
                .filter(
                    (file) => !file.metadata.ignoredWebsites.includes(option.accountId),
                )
                .map((file) => this.createUnitOfWork(submission, option, file));
        });
    }

    private async assignBatches(unitsOfWork: UnitOfWork[]): Promise<void> {
        const workByAccount = groupBy(unitsOfWork, (unit) => unit.accountId);

        await Promise.all(
            Object.entries(workByAccount).map(async ([accountId, accountWork]) => {
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

    private createUnitOfWork(
        submission: Submission,
        option: WebsiteOptions,
        file?: SubmissionFile,
    ): UnitOfWork {
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
}
