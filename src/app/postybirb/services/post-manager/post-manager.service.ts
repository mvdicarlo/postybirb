import { Injectable, Inject, forwardRef } from '@angular/core';

import { Store } from '@ngxs/store';

import { SubmissionArchive, PostyBirbSubmissionModel } from '../../models/postybirb-submission-model';
import { SubmissionStatus } from '../../enums/submission-status.enum';
import { PostyBirbStateAction } from '../../stores/states/posty-birb.state';
import { PostService } from '../post/post.service';
import { PostyBirbQueueStateAction } from '../../stores/states/posty-birb-queue.state';


@Injectable({
  providedIn: 'root'
})
export class PostManagerService {
  public posting: boolean = false;

  constructor(@Inject(forwardRef(() => Store)) private _store: Store, private postService: PostService) {
    postService.setCompletionCallback(this.completed.bind(this));
  }

  public startPosting(archive: SubmissionArchive, useSkipInterval: boolean): boolean {
    this.posting = true;

    if (this.postService.isPosting) { // guard against any incoming post while another is still in flight
      alert('Tried to post while posting! - Ignoring post attempt: ' + archive.meta.title);
      return false;
    } else {
      this.beginNextPost(archive, useSkipInterval);
      return true;
    }
  }

  public stopPosting(): void {
    this.postService.stop();
  }

  private stopOnError(): boolean {
    const enabled = db.get('stopOnFailure').value();
    return enabled === undefined ? true : enabled;
  }

  private beginNextPost(archive: SubmissionArchive, useSkipInterval: boolean): void {
    if (useSkipInterval) {
      const interval = Number(db.get('postInterval').value() || 0);
      this.postService.post(archive, interval * 60000);
    } else {
      this.postService.post(archive, 0);
    }
  }

  public completed(model: PostyBirbSubmissionModel, res: { status, remainingWebsites, responses, failedWebsites }) {
    this.posting = false;
    model.submissionStatus = res.status;
    model.unpostedWebsites = [...res.remainingWebsites, ...res.failedWebsites].sort();
    model.schedule = null; // unschedule

    const submission: SubmissionArchive = model.asSubmissionArchive();

    const dispatches = [];
    if (res.status === SubmissionStatus.INTERRUPTED) {
      dispatches.push(new PostyBirbQueueStateAction.DequeueSubmission(submission, true));
    } else {
      dispatches.push(new PostyBirbStateAction.LogSubmissionPost(model, res.responses));
      dispatches.push(new PostyBirbQueueStateAction.CompleteSubmission(model, res.status === SubmissionStatus.FAILED && this.stopOnError()));
    }

    this._store.dispatch(dispatches);
  }
}
