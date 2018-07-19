import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatBottomSheet, MatBottomSheetRef } from '@angular/material';
import { Subscription } from 'rxjs';
import { Store } from '@ngxs/store';

import { SubmissionSheetComponent } from '../sheets/submission-sheet/submission-sheet.component';

@Component({
  selector: 'posty-birb-status-bar',
  templateUrl: './posty-birb-status-bar.component.html',
  styleUrls: ['./posty-birb-status-bar.component.css']
})
export class PostyBirbStatusBarComponent implements OnInit, OnDestroy {

  private queueSubscription: Subscription = Subscription.EMPTY;
  private submissionSubscription: Subscription = Subscription.EMPTY;

  public queueCount: number = 0;
  public submissionCount: number = 0;

  constructor(private _store: Store, private bottomSheet: MatBottomSheet) { }

  ngOnInit() {
    this.submissionSubscription = this._store.select(state => state.postybirb.submissions).subscribe(submissions => this.submissionCount = submissions.length);
    this.queueSubscription = this._store.select(state => state.postybirb.queued).subscribe(submissions => this.queueCount = submissions.length);
  }

  ngOnDestroy() {
    this.queueSubscription.unsubscribe();
    this.submissionSubscription.unsubscribe();
  }

  public openQueue(): void {
    this.bottomSheet.open(SubmissionSheetComponent, {
      data: { index: 2 }
    });
  }

  public openSubmissions(): void {
    this.bottomSheet.open(SubmissionSheetComponent, {
      data: { index: 0 }
    });
  }

}
