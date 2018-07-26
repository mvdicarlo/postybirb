import { Component, OnDestroy, Output, EventEmitter, ViewChildren, QueryList } from '@angular/core';
import { Subscription, Observable } from 'rxjs';

import { PostyBirbSubmission, SubmissionArchive } from '../../../../commons/models/posty-birb/posty-birb-submission';
import { SubmissionCardComponent } from '../submission-card/submission-card.component';

import { Select, Store } from '@ngxs/store';
import { PostyBirbState, PostyBirbStateAction } from '../../../stores/states/posty-birb.state';

@Component({
  selector: 'submission-card-container',
  templateUrl: './submission-card-container.component.html',
  styleUrls: ['./submission-card-container.component.css']
})
export class SubmissionCardContainerComponent implements OnDestroy {
  @Output() update: EventEmitter<PostyBirbSubmission[]> = new EventEmitter();

  @Select(state => state.postybirb.editing) editing$: Observable<SubmissionArchive>;

  public selectedSubmissions: PostyBirbSubmission[] = [];
  public submissions: SubmissionArchive[] = [];
  private stateSubscription: Subscription = Subscription.EMPTY;

  @ViewChildren(SubmissionCardComponent)
  private cards: QueryList<SubmissionCardComponent>;

  constructor(private _store: Store) {
    this.stateSubscription = _store.select(state => state.postybirb.editing).subscribe(editing => this.submissions = editing || []);
  }

  ngOnDestroy() {
    this.stateSubscription.unsubscribe();
  }

  private findSubmission(submission: PostyBirbSubmission, arr: PostyBirbSubmission[]): number {
    if (submission) {
      return arr.findIndex(s => s.getId() === submission.getId());
    }

    return -1;
  }

  public submissionSelected(event: any): void {
    const submission = event.data;
    const index = this.findSubmission(submission, this.selectedSubmissions);

    if (event.selected) {
      if (index === -1) this.selectedSubmissions.push(submission);
    } else if (index !== -1) {
      this.selectedSubmissions.splice(index, 1);
    }

    this.onUpdate();
  }

  public submissionRemoved(submission: PostyBirbSubmission): void {
    const index = this.findSubmission(submission, this.selectedSubmissions);

    if (index !== -1) {
      this.selectedSubmissions.splice(index, 1);
      this.onUpdate();
    }

    this._store.dispatch(new PostyBirbStateAction.DeleteSubmission(submission.asSubmissionArchive()));
  }

  public addFiles(newSubmissions: PostyBirbSubmission[] = []): void {
    this._store.dispatch(newSubmissions.map(s => new PostyBirbStateAction.EditSubmission(s.asSubmissionArchive(), false)))
  }

  public removeAll(): void {
    this.selectedSubmissions = [];
    this.onUpdate();

    this._store.dispatch(this.submissions.map(s => new PostyBirbStateAction.DeleteSubmission(s)));
  }

  public removeSelected(): void {
    this._store.dispatch(this.selectedSubmissions.map(s => new PostyBirbStateAction.DeleteSubmission(s.asSubmissionArchive())));
    this.selectedSubmissions = [];
    this.onUpdate();
  }

  public removeUnselected(): void {
    this._store.dispatch(this.submissions.map(s => new PostyBirbStateAction.DeleteSubmission(s)));
    this.onUpdate();
  }

  private onUpdate(): void {
    this.update.emit(this.selectedSubmissions || []);
  }

  public clearSelected(): void {
    this.selectedSubmissions = [];
  }

  public selectAll(): void {
    if (this.cards.length > 0) {
      this.cards.forEach(c => c.select());
    }
  }

  public unselectAll(): void {
    if (this.cards.length > 0) {
      this.cards.forEach(c => c.select(false));
    }
  }

  public dropForEdit(event: any): void {
    if (event.dragData) {
      this._store.dispatch(new PostyBirbStateAction.EditSubmission(event.dragData, false))
    }
  }

}
