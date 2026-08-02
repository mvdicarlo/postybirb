import { Injectable } from '@nestjs/common';
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
    SubmissionFileId,
    SubmissionId,
    UnitOfWorkState,
} from '@postybirb/types';
import { eq as equals, inArray } from 'drizzle-orm';

export type UnitOfWorkEvictions = Record<AccountId, SubmissionFileId[]>;

export interface IncompleteWork {
    missingWork: UnitOfWork[];
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
        const existingWork = await this.getExistingWork(submissionId);
        const potentialWork = await this.getPotentialWork(submissionId);

        if (!existingWork) {
            return {
                missingWork: potentialWork.unitsOfWork,
                removedWork: [],
                evicted: [],
            };
        }

        const existingKeys = new Set(
            existingWork.unitsOfWork.map((unit) => unit.compositeKey),
        );
        const potentialKeys = new Set(
            potentialWork.unitsOfWork.map((unit) => unit.compositeKey),
        );

        return {
            missingWork: potentialWork.unitsOfWork.filter(
                (unit) => !existingKeys.has(unit.compositeKey),
            ),
            removedWork: existingWork.unitsOfWork.filter(
                (unit) => !potentialKeys.has(unit.compositeKey),
            ),
            evicted: existingWork.unitsOfWork.filter((unit) => {
                const fileIds = evictions[unit.accountId];
                if (!fileIds) {
                    return false;
                }
                return fileIds.length === 0 || (
                    unit.fileId !== undefined && fileIds.includes(unit.fileId)
                );
            }),
        };
    }

    public async post(
        submissionId: SubmissionId,
        evictions: UnitOfWorkEvictions = {},
    ): Promise<Post> {
        const incompleteWork = await this.getIncompleteWork(
            submissionId,
            evictions,
        );
        const existingPost = await this.getPost(submissionId);
        const post = existingPost ?? new Post({ submissionId });
        const evictedIds = [
            ...new Set(
                [...incompleteWork.evicted, ...incompleteWork.removedWork]
                    .map((unit) => unit.id),
            ),
        ];

        this.postRepository.db.transaction((tx) => {
            if (existingPost) {
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
                tx.update(this.unitOfWorkRepository.table)
                    .set({ evicted: true })
                    .where(
                        inArray(this.unitOfWorkRepository.table.id, evictedIds),
                    )
                    .run();
            }

            if (incompleteWork.missingWork.length > 0) {
                tx.insert(this.unitOfWorkRepository.table)
                    .values(
                        incompleteWork.missingWork.map((unit) => ({
                            ...unit.toObject(),
                            postId: post.id,
                        })),
                    )
                    .run();
            }
        });

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
}