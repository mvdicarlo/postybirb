import { Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
import { SubmissionArchive, PostyBirbSubmissionModel } from '../../models/postybirb-submission-model';
import { debounceTime } from 'rxjs/operators';
import { SubmissionEditingFormComponent } from '../../components/submission-editing-form/submission-editing-form.component';
import { SidebarNavigatorComponent } from '../../components/postybirb-primary-form/sidebar-navigator/sidebar-navigator.component';
import { MatDialog } from '@angular/material';
import { ConfirmDialogComponent } from '../../../commons/components/confirm-dialog/confirm-dialog.component';
import { PostyBirbStateAction } from '../../stores/states/posty-birb.state';
import { checkForCompletion } from '../../helpers/completion-checker.helper';
import { _filelessSubmissionCopy, _trimSubmissionFields } from '../../helpers/submission-manipulation.helper';
import { checkForWebsiteAndFileIncompatibility } from '../../helpers/incompatibility-checker.helper';
import { Observable, Subscription, BehaviorSubject } from 'rxjs';
import { SubmissionSaveDialogComponent } from '../../components/dialog/submission-save-dialog/submission-save-dialog.component';
import { PostyBirbQueueStateAction } from '../../stores/states/posty-birb-queue.state';

export interface Tracker {
  editingForm: SubmissionEditingFormComponent,
  navigator: SidebarNavigatorComponent,
  archive: SubmissionArchive,
  passing: boolean;
  issues: any;
  editing: boolean;
}

@Injectable()
export class EditableSubmissionsService {
  private editingArchives: Map<string,Tracker>;
  private subject: BehaviorSubject<Tracker[]> = new BehaviorSubject([]);
  private stateSubscription: Subscription = Subscription.EMPTY;
  public changes: Observable<Tracker[]>;

  // TODO clean up on close of providers

  constructor(private _store: Store, private dialog: MatDialog) {
    this.editingArchives = new Map();
    this.changes = this.subject.asObservable();

    this.stateSubscription = _store.select(state => state.postybirb.editing).pipe(debounceTime(50)).subscribe((editing: SubmissionArchive[]) => {
      for (let i = 0; i < editing.length; i++) {
          const archive: SubmissionArchive = editing[i];
          if (this.editingArchives.has(archive.meta.id)) {
            const tracker: Tracker = this.editingArchives.get(archive.meta.id);
            tracker.archive = archive;
            tracker.passing = this.canSave(archive);
            tracker.issues = checkForWebsiteAndFileIncompatibility(archive.submissionFile, archive.meta.rating, archive.meta.type, archive.meta.unpostedWebsites);
            this.editingArchives.set(archive.meta.id, tracker);
          } else {
            this.editingArchives.set(archive.meta.id, {
              editingForm: null,
              navigator: null,
              archive,
              passing: this.canSave(archive),
              issues: checkForWebsiteAndFileIncompatibility(archive.submissionFile, archive.meta.rating, archive.meta.type, archive.meta.unpostedWebsites),
              editing: false
            });
          }
      }

      // clean up old keys
      const currentKeys: string[] = editing.map(s => s.meta.id);
      const idKeys: string[] = [];
      this.editingArchives.forEach((value, key) => {
        idKeys.push(key);
      });

      for (let i = 0; i < idKeys.length; i++) {
          if (!currentKeys.includes(idKeys[i])) {
            this.editingArchives.delete(idKeys[i]);
          }
      }

      this._update();
    });
  }

  public addEditingForm(id: string, form: SubmissionEditingFormComponent): void {
    const tracker: Tracker = this.editingArchives.get(id);
    if (tracker) tracker.editingForm = form;
  }

  public removeEditingForm(id: string): void {
    this.addEditingForm(id, null);
  }

  public addNavigator(id: string, navigator: SidebarNavigatorComponent): void {
    const tracker: Tracker = this.editingArchives.get(id);
    if (tracker) tracker.navigator = navigator;
  }

  public removeNavigator(id: string): void {
      this.addNavigator(id, null);
  }

  public async toggleEditing(id: string, isEditing: boolean) {
    const tracker: Tracker = this.editingArchives.get(id);
    if (tracker) {
      tracker.editing = isEditing;
      this._update();
    }
  }

  public isEditing(id: string): boolean {
    const tracker: Tracker = this.editingArchives.get(id);
    if (tracker) {
      return tracker.editing;
    }

    return false;
  }

  public applyTemplate(id: string, template: any): void {
    const tracker: Tracker = this.editingArchives.get(id);
    if (tracker.editingForm) {
      tracker.editingForm.templateSelected(template);
    }
  }

  public deleteForm(id: string): void {
    let dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this._store.dispatch(new PostyBirbStateAction.DeleteSubmission(this.editingArchives.get(id).archive));
      }
    });
  }

  public saveForm(id: string, post: boolean = false, archive?: SubmissionArchive): void {
    const tracker: Tracker = this.editingArchives.get(id);
    const archiveToSave: SubmissionArchive = archive ? archive : tracker.archive;
    const submission: PostyBirbSubmissionModel = PostyBirbSubmissionModel.fromArchive(archiveToSave);

    let dialogRef = this.dialog.open(SubmissionSaveDialogComponent, {
      data: [submission]
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const trimmedSubmission = _trimSubmissionFields(submission, submission.unpostedWebsites).asSubmissionArchive();
        if (post) {
          this._store.dispatch([new PostyBirbStateAction.AddSubmission(trimmedSubmission, true), new PostyBirbQueueStateAction.EnqueueSubmission(trimmedSubmission)]);
        } else {
          this._store.dispatch(new PostyBirbStateAction.AddSubmission(trimmedSubmission, true));
        }
      }
    });
  }

  public scrollToForm(id: string): void {
    const tracker: Tracker = this.editingArchives.get(id);
    if (tracker.editingForm) {
      tracker.editingForm.title.nativeElement.focus();
    }
  }

  public isPassing(id: string): boolean {
    const tracker: Tracker = this.editingArchives.get(id);
    return (tracker.passing && Object.keys(tracker.issues).length == 0) || false;
  }

  public getIssues(id: string): any {
    return this.editingArchives.get(id).issues;
  }

  public canSave(archive: SubmissionArchive): boolean {
    if (archive.meta.rating) {
      if (!checkForCompletion(PostyBirbSubmissionModel.fromArchive(archive))) {
        return false;
      }

      return true;
    }

    return false;
  }

  public clean(): void {
    this.subject.complete();
    this.stateSubscription.unsubscribe();
  }

  private _update(): void {
    const submissions: Tracker[] = [];
    this.editingArchives.forEach((value: Tracker, key: string) => {
      submissions.push(value);
    });

    this.subject.next(submissions);
  }
}
