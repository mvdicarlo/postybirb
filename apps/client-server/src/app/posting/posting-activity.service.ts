import { ConflictException, Injectable } from '@nestjs/common';
import { PostRepository } from '@postybirb/database';
import { PostId, SubmissionId } from '@postybirb/types';

@Injectable()
export class PostingActivityService {
  private readonly acceptedJobs = new Set<PostId>();

  private readonly postRepository = new PostRepository();

  public isAccepted(postId: PostId): boolean {
    return this.acceptedJobs.has(postId);
  }

  public accept(postId: PostId, maxAcceptedJobs: number): boolean {
    if (
      this.acceptedJobs.has(postId) ||
      this.acceptedJobs.size >= maxAcceptedJobs
    ) {
      return false;
    }

    this.acceptedJobs.add(postId);
    return true;
  }

  public release(postId: PostId): void {
    this.acceptedJobs.delete(postId);
  }

  public async assertSubmissionsMutable(
    submissionIds: SubmissionId | SubmissionId[],
  ): Promise<void> {
    const ids = [
      ...new Set(
        Array.isArray(submissionIds) ? submissionIds : [submissionIds],
      ),
    ];
    if (ids.length === 0) {
      return;
    }

    const acceptedPostIds = [...this.acceptedJobs];
    if (acceptedPostIds.length === 0) {
      return;
    }

    const posts = await this.postRepository.find({
      where: (post, { and, inArray }) =>
        and(inArray(post.id, acceptedPostIds), inArray(post.submissionId, ids)),
      with: {},
    });
    const acceptedPost = posts[0];
    if (acceptedPost) {
      throw new ConflictException(
        `Submission '${acceptedPost.submissionId}' is currently being posted and cannot be modified`,
      );
    }
  }
}
