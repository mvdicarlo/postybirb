import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { PostLoggerService, PostyBirbLog } from '../../services/post-logger.service';
import { saveAs } from 'file-saver';
import { Subscription } from 'rxjs';
import { PostybirbLayout } from '../../layouts/postybirb-layout/postybirb-layout.component';

@Component({
  selector: 'post-logs',
  templateUrl: './post-logs.component.html',
  styleUrls: ['./post-logs.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PostLogs implements OnInit, OnDestroy {
  public logs: PostyBirbLog[] = [];
  public loading: boolean = true;

  private subscriber: Subscription = Subscription.EMPTY;

  constructor(private layout: PostybirbLayout, private _postLogs: PostLoggerService, private _changeDetector: ChangeDetectorRef) { }

  ngOnInit() {
    this.getLogs();
    this.subscriber = this._postLogs.onUpdate.subscribe(() => this.getLogs());
  }

  private async getLogs() {
    this.loading = true;
    this.logs = await this._postLogs.getLogs() || [];
    this.logs = this.logs.reverse();
    this.loading = false;
    this._changeDetector.markForCheck();
  }

  ngOnDestroy() {
    this.subscriber.unsubscribe();
  }

  public save(log: PostyBirbLog): void {
    const report = JSON.stringify(log, null, 1);
    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `PB_${log.success ? 'SUCCESS' : 'FAILURE'}_${log.created}.log`);
  }

  public revive(log: PostyBirbLog): void {
    this.layout.reviveSubmission(Object.assign(log.submission, { postStats: log.post }));
  }

}
