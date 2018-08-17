import { isDevMode } from '@angular/core';
import { State, Action, StateContext, NgxsOnInit } from '@ngxs/store';
import { TranslateService } from '@ngx-translate/core';
import { SnotifyService } from 'ng-snotify';

import { SubmissionArchive, PostyBirbSubmission } from '../../../commons/models/posty-birb/posty-birb-submission';
import { SubmissionStatus } from '../../enums/submission-status.enum';
import * as PostyBirbActions from '../actions/posty-birb.actions';

export interface PostyBirbSubmissionStateModel {
  editing: SubmissionArchive[];
  submissions: SubmissionArchive[];
  queued: SubmissionArchive[];
  logs: PostyBirbLog[];
}

export interface PostyBirbLog {
  timestamp: Date;
  status: SubmissionStatus;
  responses: any[];
  archive: SubmissionArchive;
}

export const PostyBirbStateAction = PostyBirbActions;

export function sort(a: SubmissionArchive, b: SubmissionArchive): number {
  if (!a.meta.schedule && !b.meta.schedule) {
    // Order based sorting
    if (a.meta.order < b.meta.order) return -1;
    if (a.meta.order > b.meta.order) return 1;
    return 0;
  } else if (b.meta.schedule && a.meta.schedule) {
    // Schedule based sorting
    const aDate: Date = new Date(a.meta.schedule);
    const bDate: Date = new Date(b.meta.schedule);

    if (aDate < bDate) return -1;
    if (aDate > bDate) return 1;
    return 0;
  } else {
    // Always prioritize scheduled if mixed scenario
    if (a.meta.schedule && !b.meta.schedule) return 1;
    else return -1;
  }
}

class SaveState {
  static readonly type: string = '[PostyBirb] Save State';
  constructor(public state: PostyBirbSubmissionStateModel) { }
}

@State<PostyBirbSubmissionStateModel>({
  name: 'postybirb',
  defaults: {
    editing: [],
    submissions: [],
    queued: [],
    logs: []
  }
})
export class PostyBirbState implements NgxsOnInit {

  constructor(private translate: TranslateService, private snotify: SnotifyService) { }

  ngxsOnInit(ctx: StateContext<PostyBirbSubmissionStateModel>) {
    const state = db.get('PostyBirbState').value() || {
      editing: [],
      submissions: [],
      queued: [],
      logs: []
    };

    state.queued = [];
    for (let i = 0; i < state.submissions.length; i++) {
      const archive = state.submissions[i];
      if (archive.meta.submissionStatus === SubmissionStatus.QUEUED || archive.meta.submissionStatus === SubmissionStatus.POSTING) {
        archive.meta.submissionStatus = SubmissionStatus.INTERRUPTED
      }
    }

    ctx.setState(state);
  }

  @Action(SaveState)
  saveState(ctx: StateContext<PostyBirbSubmissionStateModel>, action: SaveState) {
    if (isDevMode()) console.log('Saving State', action.state);
    db.set('PostyBirbState', action.state || {
      editing: [],
      submissions: [],
      queued: []
    }).write();
  }

  @Action(PostyBirbActions.AddSubmission)
  addSubmission(ctx: StateContext<PostyBirbSubmissionStateModel>, action: PostyBirbActions.AddSubmission) {
    const { editing, submissions }: PostyBirbSubmissionStateModel = ctx.getState();
    let newSubmissions = [];
    let newEditing = [];

    if (action.update) {
      newSubmissions = [...submissions];
      const index: number = this.findIndex(action.archive.meta.id, submissions);
      if (index !== -1) newSubmissions[index] = action.archive;
      else {
        action.archive.meta.order = 9999;
        newSubmissions.push(action.archive);
      }
    } else {
      action.archive.meta.order = 9999;
      newSubmissions = [...submissions, action.archive];
    }

    const index: number = this.findIndex(action.archive.meta.id, editing);
    newEditing = [...editing];
    if (index !== -1) {
      newEditing.splice(index, 1);
    }

    newSubmissions = newSubmissions.sort(sort);
    for (let i = 0; i < newSubmissions.length; i++) {
      newSubmissions[i].meta.order = i;
    }

    ctx.patchState({
      editing: newEditing,
      submissions: newSubmissions
    });

    return ctx.dispatch(new SaveState(ctx.getState()));
  }

  @Action(PostyBirbActions.EditSubmission)
  editSubmission(ctx: StateContext<PostyBirbSubmissionStateModel>, action: PostyBirbActions.EditSubmission) {
    const { editing, submissions }: PostyBirbSubmissionStateModel = ctx.getState();
    let newSubmissions = [...submissions];

    const editedArchive = JSON.parse(JSON.stringify(action.archive));
    editedArchive.defaultFields.selectedWebsites = [...editedArchive.meta.unpostedWebsites];

    if (action.copy) {
      editedArchive.meta.id = PostyBirbSubmission.generateId();
      editedArchive.meta.order = 9999;
      editedArchive.meta.submissionStatus = SubmissionStatus.UNPOSTED;
    } else {
      const index: number = this.findIndex(action.archive.meta.id, submissions);
      if (index !== -1) {
        newSubmissions.splice(index, 1);
      }
    }

    ctx.patchState({
      editing: [...editing, editedArchive],
      submissions: newSubmissions
    });

    return ctx.dispatch(new SaveState(ctx.getState()));
  }

  @Action(PostyBirbActions.ReorderSubmission)
  reorderSubmission(ctx: StateContext<PostyBirbSubmissionStateModel>, action: PostyBirbActions.ReorderSubmission) {
    const { submissions }: PostyBirbSubmissionStateModel = ctx.getState();
    let newSubmissions = [...submissions];

    const index: number = this.findIndex(action.archive.meta.id, submissions);
    newSubmissions[index] = action.archive;

    newSubmissions = newSubmissions.sort(sort);
    for (let i = 0; i < newSubmissions.length; i++) {
      newSubmissions[i].meta.order = i;
    }

    ctx.patchState({
      submissions: newSubmissions
    });

    return ctx.dispatch(new SaveState(ctx.getState()));
  }

  @Action(PostyBirbActions.DeleteSubmission)
  deleteSubmission(ctx: StateContext<PostyBirbSubmissionStateModel>, action: PostyBirbActions.DeleteSubmission) {
    const { editing, submissions, queued }: PostyBirbSubmissionStateModel = ctx.getState();
    let newEditing = [...editing];
    let newSubmissions = [...submissions];
    let newQueued = [...queued];

    if (editing.length > 0) {
      const index: number = this.findIndex(action.archive.meta.id, newEditing);
      if (index !== -1) newEditing.splice(index, 1);
    }

    if (submissions.length > 0) {
      const index: number = this.findIndex(action.archive.meta.id, newSubmissions);
      if (index !== -1) newSubmissions.splice(index, 1);
    }

    if (queued.length > 0) {
      const index: number = this.findIndex(action.archive.meta.id, newQueued);
      if (index !== -1) newQueued.splice(index, 1);
    }

    ctx.patchState({
      editing: newEditing,
      submissions: newSubmissions,
      queued: newQueued
    });

    return ctx.dispatch(new SaveState(ctx.getState()));
  }

  @Action(PostyBirbActions.QueueSubmission)
  queueSubmission(ctx: StateContext<PostyBirbSubmissionStateModel>, action: PostyBirbActions.QueueSubmission) {
    const { queued, submissions }: PostyBirbSubmissionStateModel = ctx.getState();
    let newSubmissions = [...submissions];

    const index: number = this.findIndex(action.archive.meta.id, newSubmissions);
    newSubmissions[index].meta.submissionStatus = SubmissionStatus.QUEUED;

    ctx.patchState({
      queued: [...queued, action.archive],
      submissions: newSubmissions
    });

    return ctx.dispatch(new SaveState(ctx.getState()));
  }

  @Action(PostyBirbActions.DequeueSubmission)
  dequeueSubmission(ctx: StateContext<PostyBirbSubmissionStateModel>, action: PostyBirbActions.DequeueSubmission) {
    const { queued, submissions }: PostyBirbSubmissionStateModel = ctx.getState();
    let newSubmissions = [...submissions];
    let queuedSubmissions = [...queued];

    if (action.interrupted) {
      action.archive.meta.submissionStatus = SubmissionStatus.INTERRUPTED;
    } else {
      action.archive.meta.submissionStatus = SubmissionStatus.UNPOSTED;
    }

    const index: number = this.findIndex(action.archive.meta.id, newSubmissions);
    newSubmissions[index] = action.archive;

    const queuedIndex: number = this.findIndex(action.archive.meta.id, queuedSubmissions);
    if (queuedIndex !== -1) { // Should I worry about a scenario where it is dequeued when it is already posted?
      queuedSubmissions.splice(queuedIndex, 1);
    }

    ctx.patchState({
      queued: queuedSubmissions,
      submissions: newSubmissions
    });

    return ctx.dispatch(new SaveState(ctx.getState()));
  }

  @Action(PostyBirbActions.DequeueAllSubmissions)
  dequeueAllSubmissions(ctx: StateContext<PostyBirbSubmissionStateModel>) {
    const { submissions }: PostyBirbSubmissionStateModel = ctx.getState();
    let newSubmissions = [...submissions];

    for (let i = 0; i < newSubmissions.length; i++) {
      const s = newSubmissions[i];
      if (s.meta.submissionStatus === SubmissionStatus.POSTING || s.meta.submissionStatus === SubmissionStatus.QUEUED) {
        s.meta.submissionStatus = SubmissionStatus.INTERRUPTED;
      }
    }

    ctx.patchState({
      queued: [],
      submissions: newSubmissions
    });

    return ctx.dispatch(new SaveState(ctx.getState()));
  }

  @Action(PostyBirbActions.CompleteSubmission)
  completeSubmission(ctx: StateContext<PostyBirbSubmissionStateModel>, action: PostyBirbActions.CompleteSubmission) {
    const { queued, submissions }: PostyBirbSubmissionStateModel = ctx.getState();
    let newSubmissions = [...submissions];
    let queuedSubmissions = [...queued];

    const submission = action.submission;
    const failed = submission.getSubmissionStatus() === SubmissionStatus.FAILED;

    this.outputNotification(submission);

    if (!failed) {
      const index: number = this.findIndex(submission.getId(), newSubmissions);
      if (index !== -1) {
        newSubmissions.splice(index, 1);
      }
    }

    const queuedIndex: number = this.findIndex(submission.getId(), queuedSubmissions);
    if (queuedIndex !== -1) {
      queuedSubmissions.splice(queuedIndex, 1);
    }

    ctx.patchState({
      queued: queuedSubmissions,
      submissions: newSubmissions
    });

    if (failed) return ctx.dispatch(new PostyBirbActions.AddSubmission(submission.asSubmissionArchive(), true));
    else return ctx.dispatch(new SaveState(ctx.getState()));
  }

  @Action(PostyBirbActions.LogSubmissionPost)
  logSubmission(ctx: StateContext<PostyBirbSubmissionStateModel>, action: PostyBirbActions.LogSubmissionPost) {
    const logs: any[] = ctx.getState().logs || [];

    const log: PostyBirbLog = {
      responses: action.responses,
      timestamp: new Date(),
      archive: action.submission.asSubmissionArchive(),
      status: action.submission.getSubmissionStatus()
    }

    let newLogs = [log, ...logs];
    if (newLogs.length > 5) {
      newLogs = newLogs.slice(0, 5);
    }

    ctx.patchState({
      logs: newLogs
    });

    ctx.dispatch(new SaveState(ctx.getState()));
  }

  private outputNotification(submission: PostyBirbSubmission): void {
    const failed = submission.getSubmissionStatus() === SubmissionStatus.FAILED;

    submission.getSubmissionFileSource().then(src => {
      this.translate.get(failed ? 'Submission Failed' : 'Submission Posted').subscribe((title) => {
        this.translate.get(failed ? 'Submission failed message' : 'Submission posted message', { value: submission.getTitle() }).subscribe((msg) => {
          new Notification(title, {
            body: msg,
            icon: src
          });

          failed ? this.snotify.error(`${msg} (${submission.getUnpostedWebsites().join(', ')})`, { timeout: 30000 }) : this.snotify.success(msg, { timeout: 10000 });
        });
      });
    });
  }

  private findIndex(id: string, arr: SubmissionArchive[]): number {
    let index = -1;

    if (arr.length > 0) {
      for (let i = 0; i < arr.length; i++) {
        if (arr[i].meta.id === id) return i;
      }
    }

    return index;
  }

}
