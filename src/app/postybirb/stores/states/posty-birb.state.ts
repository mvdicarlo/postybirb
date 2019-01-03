import { isDevMode } from '@angular/core';
import { Subject } from 'rxjs'
import { debounceTime } from 'rxjs/operators';
import { State, Action, StateContext, NgxsOnInit } from '@ngxs/store';
import { TranslateService } from '@ngx-translate/core';
import { SnotifyService } from 'ng-snotify';

import { SubmissionArchive, PostyBirbSubmissionModel } from '../../models/postybirb-submission-model';
import { SubmissionStatus } from '../../enums/submission-status.enum';
import * as PostyBirbActions from '../actions/posty-birb.actions';
import { PostyBirbQueueStateAction } from './posty-birb-queue.state';
import { ViewSubmissionsManagerService } from '../../services/view-submissions-manager/view-submissions-manager.service';

export interface PostyBirbSubmissionStateModel {
  editing: SubmissionArchive[];
  submissions: SubmissionArchive[];
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
  }
})
export class PostyBirbState implements NgxsOnInit {

  private saveSubject: Subject<PostyBirbSubmissionStateModel>;

  constructor(private translate: TranslateService, private snotify: SnotifyService, private viewSubmissionManager: ViewSubmissionsManagerService) {
    this.saveSubject = new Subject();
    this.saveSubject.pipe(debounceTime(200)).subscribe((state) => {
      if (isDevMode()) console.log('Saving State', state);
      db.set('PostyBirbState', state || {
        editing: [],
        submissions: [],
      }).write();
    });
  }

  ngxsOnInit(ctx: StateContext<PostyBirbSubmissionStateModel>) {
    const state = db.get('PostyBirbState').value() || {
      editing: [],
      submissions: [],
    };

    delete state.logs;
    state.queued = [];
    for (let i = 0; i < state.submissions.length; i++) {
      const archive = state.submissions[i];
      if (archive.meta.submissionStatus === SubmissionStatus.QUEUED || archive.meta.submissionStatus === SubmissionStatus.POSTING) {
        archive.meta.submissionStatus = SubmissionStatus.INTERRUPTED
      }
    }

    ctx.setState(this.updateFromOldArchives(state));
  }

  private updateFromOldArchives(state: PostyBirbSubmissionStateModel): PostyBirbSubmissionStateModel {
    const newState = {
      editing: [],
      submissions: [],
    };

    for (let i = 0; i < state.editing.length; i++) {
      newState.editing.push(this.convertOldArchive(state.editing[i]))
    }

    for (let i = 0; i < state.submissions.length; i++) {
      newState.submissions.push(this.convertOldArchive(state.submissions[i]))
    }

    return newState;
  }

  private convertOldArchive(old: any): SubmissionArchive {
    if (old.defaultFields) {
      const newArchive: SubmissionArchive = {
        meta: old.meta,
        additionalFiles: old.additionalFiles,
        thumbnailFile: old.thumbnailFile,
        submissionBuffer: old.submissionBuffer,
        submissionFile: old.submissionFile,
        descriptionInfo: {},
        tagInfo: {},
        optionInfo: {}
      };

      newArchive.meta.rating = old.meta.submissionRating;

      const descriptions = {
        default: old.defaultFields.defaultDescription,
      };

      const tags = {
        default: old.defaultFields.defaultTags
      };

      const options = {};

      const websiteData = old.websiteFields;
      const keys = Object.keys(websiteData);
      for (let i = 0; i < keys.length; i++) {
        const website = keys[i];
        const wData = websiteData[website];
        options[website] = wData.options;
        descriptions[website] = wData.description;
        tags[website] = wData.tags;
      }

      newArchive.optionInfo = options;
      newArchive.descriptionInfo = descriptions;
      newArchive.tagInfo = tags;

      return newArchive;
    } else {
      return old;
    }
  }

  @Action(SaveState)
  saveState(ctx: StateContext<PostyBirbSubmissionStateModel>, action: SaveState) {
    this.saveSubject.next(action.state);
  }

  @Action(PostyBirbActions.AddSubmission)
  addSubmission(ctx: StateContext<PostyBirbSubmissionStateModel>, action: PostyBirbActions.AddSubmission) {
    const { editing, submissions }: PostyBirbSubmissionStateModel = ctx.getState();
    let newSubmissions = [];
    let newEditing = [];

    if (!action.archive.meta.title) {
      action.archive.meta.title = 'New Submission'; // manually set the title for a saved submission that has no title given
    }

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

    if (action.openSheet) {
      this.viewSubmissionManager.askToOpenSheet();
    }

    return ctx.dispatch(new SaveState(ctx.getState()));
  }

  @Action(PostyBirbActions.UpdateWebsites)
  updateSubmissionWebsites(ctx: StateContext<PostyBirbSubmissionStateModel>, action: PostyBirbActions.UpdateWebsites) {
    const { submissions } = ctx.getState();
    let newSubmissions = [...submissions];

    const index: number = this.findIndex(action.archive.meta.id, newSubmissions);
    if (index !== -1) {
      newSubmissions[index].meta.unpostedWebsites = action.websites;
    }

    ctx.patchState({
      submissions: newSubmissions
    });

    return ctx.dispatch(new SaveState(ctx.getState()));
  }

  @Action(PostyBirbActions.UpdateStatus)
  updateSubmissionStatus(ctx: StateContext<PostyBirbSubmissionStateModel>, action: PostyBirbActions.UpdateStatus) {
    const { submissions } = ctx.getState();
    let newSubmissions = [...submissions];

    const index: number = this.findIndex(action.archive.meta.id, newSubmissions);
    if (index !== -1) {
      newSubmissions[index].meta.submissionStatus = action.status;
      if (action.status === SubmissionStatus.POSTING) {
        newSubmissions[index].meta.schedule = null;
      }
    }

    ctx.patchState({
      submissions: newSubmissions
    });

    return ctx.dispatch(new SaveState(ctx.getState()));
  }

  @Action(PostyBirbActions.UpdateSubmission) // refers to submissions in editing
  updateSubmission(ctx: StateContext<PostyBirbSubmissionStateModel>, action: PostyBirbActions.UpdateSubmission) {
    const { editing } = ctx.getState();
    let newEditing = [...editing];
    const index: number = this.findIndex(action.archive.meta.id, newEditing);
    if (index !== -1) {
      newEditing[index] = action.archive;
    }

    ctx.patchState({
      editing: newEditing
    });

    return ctx.dispatch(new SaveState(ctx.getState()));
  }

  @Action(PostyBirbActions.EditSubmission)
  editSubmission(ctx: StateContext<PostyBirbSubmissionStateModel>, action: PostyBirbActions.EditSubmission) {
    const { editing, submissions }: PostyBirbSubmissionStateModel = ctx.getState();
    let newSubmissions = [...submissions];

    const editedArchive = JSON.parse(JSON.stringify(action.archive));
    editedArchive.meta.unpostedWebsites = [...editedArchive.meta.unpostedWebsites];

    if (action.copy) {
      editedArchive.meta.id = PostyBirbSubmissionModel.generateId();
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

    for (let i = 0; i < newSubmissions.length; i++) {
        const submission: SubmissionArchive = newSubmissions[i];
        if (submission.meta.order == action.previousIndex) {
          submission.meta.order = action.currentIndex;
          continue;
        }

        if (submission.meta.order == action.currentIndex) {
          submission.meta.order = action.previousIndex;
        }
    }

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
    const { editing, submissions }: PostyBirbSubmissionStateModel = ctx.getState();
    let newEditing = [...editing];
    let newSubmissions = [...submissions];

    if (editing.length > 0) {
      const index: number = this.findIndex(action.archive.meta.id, newEditing);
      if (index !== -1) newEditing.splice(index, 1);
    }

    if (submissions.length > 0) {
      const index: number = this.findIndex(action.archive.meta.id, newSubmissions);
      if (index !== -1) newSubmissions.splice(index, 1);
    }

    ctx.patchState({
      editing: newEditing,
      submissions: newSubmissions,
    });

    return ctx.dispatch([new PostyBirbQueueStateAction.DequeueSubmission(action.archive, false), new SaveState(ctx.getState())]);
  }

  @Action(PostyBirbActions.CompleteSubmission)
  completeSubmission(ctx: StateContext<PostyBirbSubmissionStateModel>, action: PostyBirbActions.CompleteSubmission) {
    const { submissions }: PostyBirbSubmissionStateModel = ctx.getState();
    let newSubmissions = [...submissions];

    const submission = action.submission;
    const failed = submission.submissionStatus === SubmissionStatus.FAILED;

    this.outputNotification(submission);

    const index: number = this.findIndex(submission.getId(), newSubmissions);
    if (index !== -1) {
      if (!failed) {
        newSubmissions.splice(index, 1);
      } else {
        newSubmissions[index] = submission.asSubmissionArchive();
      }
    }

    ctx.patchState({
      submissions: newSubmissions
    });

    return ctx.dispatch(new SaveState(ctx.getState()));
  }

  @Action(PostyBirbActions.LogSubmissionPost)
  logSubmission(ctx: StateContext<PostyBirbSubmissionStateModel>, action: PostyBirbActions.LogSubmissionPost) {
    const logs: any[] = logdb.get('logs').value() || [];

    action.submission.title = action.submission.title || 'No Title';

    const log: PostyBirbLog = {
      responses: action.responses,
      timestamp: new Date(),
      archive: action.submission.asSubmissionArchive(),
      status: action.submission.submissionStatus
    }

    let newLogs = [log, ...logs];
    if (newLogs.length > 5) {
      newLogs = newLogs.slice(0, 5);
    }

    logdb.set('logs', newLogs).write();
  }

  private outputNotification(submission: PostyBirbSubmissionModel): void {
    const failed = submission.submissionStatus === SubmissionStatus.FAILED;

    submission.getSubmissionFileSource().then(src => {
      this.translate.get(failed ? 'Submission Failed' : 'Submission Posted').subscribe((title) => {
        this.translate.get(failed ? 'Submission failed message' : 'Submission posted message', { value: submission.title }).subscribe((msg) => {
          new Notification(title, {
            body: msg,
            icon: src
          });

          failed ? this.snotify.error(`${msg} (${submission.unpostedWebsites.join(', ')})`, { timeout: 30000, showProgressBar: true }) : this.snotify.success(msg, { timeout: 10000, showProgressBar: true });
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
