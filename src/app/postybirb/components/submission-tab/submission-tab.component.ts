import { Component, OnInit, OnDestroy, Input, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { SubmissionCache } from 'src/app/database/services/submission-cache.service';
import { TabInfo, TabManager } from '../../services/tab-manager.service';
import { Submission } from 'src/app/database/models/submission.model';
import { Subscription  } from 'rxjs';

@Component({
  selector: 'submission-tab',
  templateUrl: './submission-tab.component.html',
  styleUrls: ['./submission-tab.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'd-block'
  }
})
export class SubmissionTabComponent implements OnInit, OnDestroy {
  @Input() tab: TabInfo;
  public submission: Submission;
  public hideForRefresh: boolean = false;
  private submissionChangeSubscription: Subscription = Subscription.EMPTY;

  constructor(private _cache: SubmissionCache, private _changeDetector: ChangeDetectorRef, private _tabManager: TabManager) { }

  ngOnInit() {
    this._initialize();
  }

  ngOnDestroy() {
    this.submissionChangeSubscription.unsubscribe();
  }

  private async _initialize(): Promise<void> {
    this.submission = await this._cache.get(this.tab.id);
    if (this.submission) {
      this.submissionChangeSubscription = this.submission.changes.subscribe(changes => {
        if (changes.title) {
          this._changeDetector.markForCheck();
        }

        // trigger the icon refresh
        if (changes.file) {
          this.hideForRefresh = true;
          this._changeDetector.detectChanges();
          this.hideForRefresh = false;
          this._changeDetector.detectChanges();
          this._changeDetector.markForCheck();
        }
      });
    }

    this._changeDetector.markForCheck();
  }

  public close(event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    this._tabManager.removeTab(this.tab.id);
  }

}
