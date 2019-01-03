import { State, Action, StateContext, NgxsOnInit, Store } from '@ngxs/store';

import { SubmissionArchive, PostyBirbSubmissionModel } from '../../models/postybirb-submission-model';
import { SubmissionStatus } from '../../enums/submission-status.enum';
import * as PostyBirbQueueActions from '../actions/posty-birb-queue.actions';
import { PostManagerService } from '../../services/post-manager/post-manager.service';
import { sort, PostyBirbStateAction } from './posty-birb.state';

export interface PostyBirbQueueStateModel {
  queued: SubmissionArchive[];
  posting: SubmissionArchive;
}

export const PostyBirbQueueStateAction = PostyBirbQueueActions;

@State<PostyBirbQueueStateModel>({
  name: 'postybirbqueue',
  defaults: {
    queued: [],
    posting: null
  }
})
export class PostyBirbQueueState implements NgxsOnInit {

  constructor(private stateManager: PostManagerService, private _store: Store) { }

  ngxsOnInit(ctx: StateContext<PostyBirbQueueStateModel>) { }

  @Action(PostyBirbQueueActions.EnqueueSubmission)
  queueSubmission(ctx: StateContext<PostyBirbQueueStateModel>, action: PostyBirbQueueActions.EnqueueSubmission) {
    const state: PostyBirbQueueStateModel = ctx.getState();

    const newState: any = {};
    // don't want to re-queue the same submission
    const queuedIndex = this.findIndex(action.archive.meta.id, state.queued);
    if (queuedIndex === -1) {
      // ignore the requeue of a posting submission
      if (state.posting && state.posting.meta.id === action.archive.meta.id) {
        return;
      }

      let queued = [...state.queued];
      let posting = null;

      action.archive = this.findCurrentState(action.archive.meta.id); // ensure we have the latest - it might not be that necessary, but it helps me feel better

      // check to see if currently in posting state
      if (state.posting || this.stateManager.posting) {
        // check that if in posting state, to ignore any submission that has the same ID as the posting submission to avoid re-queue
        if (state.posting && action.archive.meta.id !== state.posting.meta.id) {
          queued.push(action.archive);
          action.archive.meta.submissionStatus = SubmissionStatus.QUEUED;
        }
      } else { // no submission currently in queue so set one
        posting = action.archive;
        action.archive.meta.submissionStatus = SubmissionStatus.POSTING;
      }

      if (posting) { // if we have an initial posting -> start it with no skip interval
        const isAllowedToPost: boolean = this.stateManager.startPosting(posting, false);
        if (!isAllowedToPost) {
          queued = [posting, ...queued];
          newState.posting = true;
          posting = null;
        } else {
          newState.posting = posting;
        }
      }

      newState.queued = queued.sort(sort);

      ctx.patchState(newState);

      // update posting state in other form
      return ctx.dispatch(new PostyBirbStateAction.UpdateStatus(action.archive, posting ? SubmissionStatus.POSTING : SubmissionStatus.QUEUED));
    }
  }

  @Action(PostyBirbQueueActions.DequeueSubmission)
  dequeueSubmission(ctx: StateContext<PostyBirbQueueStateModel>, action: PostyBirbQueueActions.DequeueSubmission) {
    const state: PostyBirbQueueStateModel = ctx.getState();
    const dispatches: any = [];

    // determine state to insert back into other state
    if (action.interrupted) {
      action.archive.meta.submissionStatus = SubmissionStatus.INTERRUPTED;
    } else {
      action.archive.meta.submissionStatus = SubmissionStatus.UNPOSTED;
    }

    // remove out the dequeued object
    const queued = [...state.queued];
    const queuedIndex: number = this.findIndex(action.archive.meta.id, queued);
    if (queuedIndex !== -1) {
      queued.splice(queuedIndex, 1);
    }

    // If the one that was dequeued was the one that was posting, set it to null or whatever is next in line.
    // Not calling stop here because I assume it is already called once before
    let posting = state.posting;
    if (state.posting && state.posting.meta.id === action.archive.meta.id) {
      posting = queued.length ? queued.shift() : null;
      if (posting) posting = this.findCurrentState(posting.meta.id); // ensure not stale item
      if (posting) { // if we need to move to the next in line
        this.stateManager.startPosting(posting, true);
        dispatches.push(new PostyBirbStateAction.UpdateStatus(posting, SubmissionStatus.POSTING));
      }
    }

    ctx.patchState({
      queued,
      posting
    });

    dispatches.push(new PostyBirbStateAction.UpdateStatus(action.archive, action.archive.meta.submissionStatus));

    return ctx.dispatch(dispatches);
  }

  @Action(PostyBirbQueueActions.DequeueAllSubmissions)
  dequeueAllSubmissions(ctx: StateContext<PostyBirbQueueStateModel>) {
    const state: PostyBirbQueueStateModel = ctx.getState();

    // if in posting state -> tell the post manager to stop
    // we do not call an update status on this submission because it will be done by the stop posting call once it returns from the post service
    // we assume the stopPosting call has been called elsewhere

    // clear all back to initial
    ctx.patchState({
      queued: [],
      posting: null
    });

    // update the submission status to be unposted
    return ctx.dispatch(state.queued.map(s => {
      return new PostyBirbStateAction.UpdateStatus(s, SubmissionStatus.UNPOSTED);
    }));
  }

  @Action(PostyBirbQueueActions.CompleteSubmission)
  completeSubmission(ctx: StateContext<PostyBirbQueueStateModel>, action: PostyBirbQueueActions.CompleteSubmission) {
    const state: PostyBirbQueueStateModel = ctx.getState();

    const submission = action.submission;
    submission.schedule = null; // unschedule in any scenario

    // try to find if we need a new post (timing issue of enqueue at the same time as complete?)
    let posting = null;
    let queued = [...state.queued];
    if (!action.dequeueAll && queued.length > 0) {
      posting = queued.shift();
      posting = this.findCurrentState(posting.meta.id); // ensure we are most current and don't have a stale item
    }

    const dispatches: any = [];

    if (posting) { // if we have a new post, start it with a skipInterval
      const isAllowedToPost: boolean = this.stateManager.startPosting(posting, true);
      if (isAllowedToPost) {
        dispatches.push(new PostyBirbStateAction.UpdateStatus(posting, SubmissionStatus.POSTING));
      } else {
        queued = [posting, ...queued];
        posting = true; // don't care to retrieve - setting it to this should be enough - this should never happen anyways
      }
    }

    dispatches.push(new PostyBirbStateAction.CompleteSubmission(submission));
    if (action.dequeueAll) dispatches.push(new PostyBirbQueueStateAction.DequeueAllSubmissions());

    ctx.patchState({
      queued,
      posting
    });

    // allow write times if this was an automated post
    if (!posting && immediatelyCheckForScheduled) {
      setTimeout(function() {
        window.close();
      }, 10000); // allow write times
    }

    // call a complete from the other state to clean up submission
    return ctx.dispatch(dispatches);
  }

  private findIndex(id: string, arr: SubmissionArchive[]): number {
    let index = -1;

    if (!id) return -1;

    if (arr.length > 0) {
      for (let i = 0; i < arr.length; i++) {
        if (arr[i].meta.id === id) return i;
      }
    }

    return index;
  }

  private findCurrentState(id: string): SubmissionArchive {
    let archives = [];
    this._store.selectSnapshot(state => archives = state.postybirb.submissions);
    const index = this.findIndex(id, archives);
    if (index !== -1) {
      return archives[index];
    }

    return null;
  }

}
