import { ConflictException } from '@nestjs/common';
import {
    clearDatabase,
    PostRepository,
    SubmissionRepository,
} from '@postybirb/database';
import {
    ISubmissionMetadata,
    ScheduleType,
    SubmissionType,
} from '@postybirb/types';
import { PostingActivityService } from './posting-activity.service';

describe('PostingActivityService', () => {
  let submissionRepository: SubmissionRepository;
  let postRepository: PostRepository;
  let service: PostingActivityService;

  beforeEach(() => {
    clearDatabase();
    submissionRepository = new SubmissionRepository();
    postRepository = new PostRepository();
    service = new PostingActivityService();
  });

  afterEach(() => {
    clearDatabase();
  });

  async function seedSubmission() {
    return submissionRepository.insert({
      type: SubmissionType.MESSAGE,
      isScheduled: false,
      isTemplate: false,
      isMultiSubmission: false,
      isArchived: false,
      isInitialized: true,
      schedule: { scheduleType: ScheduleType.NONE },
      metadata: {} as ISubmissionMetadata,
      dependsOn: [],
      order: 0,
    });
  }

  it('rejects mutations for an accepted submission post', async () => {
    const submission = await seedSubmission();
    const post = await postRepository.insert({ submissionId: submission.id });
    expect(service.accept(post.id, 3)).toBe(true);

    await expect(
      service.assertSubmissionsMutable(submission.id),
    ).rejects.toThrow(
      new ConflictException(
        `Submission '${submission.id}' is currently being posted and cannot be modified`,
      ),
    );
  });

  it('allows mutations when a post is unaccepted or released', async () => {
    const submission = await seedSubmission();
    const post = await postRepository.insert({ submissionId: submission.id });

    await expect(
      service.assertSubmissionsMutable(submission.id),
    ).resolves.toBeUndefined();

    service.accept(post.id, 3);
    service.release(post.id);

    await expect(
      service.assertSubmissionsMutable(submission.id),
    ).resolves.toBeUndefined();
  });

  it('rejects a batch when any submission is accepted', async () => {
    const first = await seedSubmission();
    const second = await seedSubmission();
    const post = await postRepository.insert({ submissionId: second.id });
    service.accept(post.id, 3);

    await expect(
      service.assertSubmissionsMutable([first.id, second.id, first.id]),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
