import { Injectable } from '@angular/core';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { Store } from '@ngxs/store';

import { SubmissionArchive, PostyBirbSubmissionModel } from '../../models/postybirb-submission-model';
import { SubmissionStatus } from '../../enums/submission-status.enum';
import { PostyBirbStateAction } from '../../stores/states/posty-birb.state';
import { PostService } from '../post/post.service';


@Injectable({
  providedIn: 'root'
})
export class PostManagerService {

  private queuedSubmissions: SubmissionArchive[] = [];
  private skipInterval: boolean = true;

  constructor(private _store: Store, private postService: PostService) {
    _store.select(state => state.postybirb.queued).pipe(debounceTime(50)).subscribe((queued: SubmissionArchive[]) => {
      this.queuedSubmissions = [...queued];

      if (this.queuedSubmissions.length === 0) {
        this.skipInterval = true; // queue assumed to be cleared
      }

      this.beginNextPost();

      // check for more posts in queue for post interval setting
      if (this.queuedSubmissions.length > 0) {
        this.skipInterval = false;
      } else {
        this.skipInterval = true;
      }
    });
  }

  private stopOnError(): boolean {
    const enabled = db.get('stopOnFailure').value();
    return enabled === undefined ? true : enabled;
  }

  private beginNextPost(): void {
    if (this.queuedSubmissions.length > 0) {
      if (!this.postService.isPosting) {
        const submission = this.queuedSubmissions.shift();
        submission.meta.submissionStatus = SubmissionStatus.POSTING;
        this._store.dispatch(new PostyBirbStateAction.AddSubmission(submission, true));

        const interval = Number(db.get('postInterval').value() || 0);
        if (interval && !this.skipInterval) {
          this.postService.post(submission, this.completed.bind(this), interval * 60000);
        } else {
          this.postService.post(submission, this.completed.bind(this), 0);
        }
      }
    }
  }

  private completed(model: PostyBirbSubmissionModel, res: { status, remainingWebsites, responses, failedWebsites }): void {
    model.submissionStatus = res.status;
    model.unpostedWebsites = [...res.remainingWebsites, ...res.failedWebsites].sort();
    model.schedule = null; // unschedule

    const submission: SubmissionArchive = model.asSubmissionArchive();

    if (res.status === SubmissionStatus.INTERRUPTED) {
      this._store.dispatch(new PostyBirbStateAction.DequeueSubmission(submission, true));
    } else {
      this._store.dispatch(new PostyBirbStateAction.LogSubmissionPost(model, res.responses));
      this._store.dispatch(new PostyBirbStateAction.CompleteSubmission(model));

      if (res.status === SubmissionStatus.FAILED && this.stopOnError()) {
        this._store.dispatch(new PostyBirbStateAction.DequeueAllSubmissions());
        this.queuedSubmissions = [];
      }
    }

  }
}
