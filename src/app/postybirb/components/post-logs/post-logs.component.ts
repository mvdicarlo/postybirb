import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { PostLoggerService, PostyBirbLog } from '../../services/post-logger.service';
import { saveAs } from 'file-saver';
import { Subscription } from 'rxjs';

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

  constructor(private _postLogs: PostLoggerService, private _changeDetector: ChangeDetectorRef) { }

  async ngOnInit() {
    this.logs = await this._postLogs.getLogs() || [];
    this.logs = this.logs.reverse();
    this.loading = false;
    this._changeDetector.markForCheck();

    this.subscriber = this._postLogs.onUpdate.subscribe(() => this.ngOnInit());
  }

  ngOnDestroy() {
    this.subscriber.unsubscribe();
  }

  public save(log: PostyBirbLog): void {
    const report = JSON.stringify(log, null, 1);
    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `PB_${log.success ? 'SUCCESS' : 'FAILURE'}_${log.created}.log`);
  }

}
