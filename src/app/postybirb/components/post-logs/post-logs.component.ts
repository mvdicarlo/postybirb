import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { PostLoggerService, PostyBirbLog } from '../../services/post-logger.service';
import { saveAs } from 'file-saver';

@Component({
  selector: 'post-logs',
  templateUrl: './post-logs.component.html',
  styleUrls: ['./post-logs.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PostLogs implements OnInit {
  public logs: PostyBirbLog[] = [];
  public loading: boolean = true;

  constructor(private _postLogs: PostLoggerService, private _changeDetector: ChangeDetectorRef) { }

  async ngOnInit() {
    this.logs = await this._postLogs.getLogs() || [];
    this.logs = this.logs.reverse();
    this.loading = false;
    this._changeDetector.markForCheck();
  }

  public save(log: PostyBirbLog): void {
    const report = JSON.stringify(log, null, 1);
    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `PB_${log.success ? 'SUCCESS' : 'FAILURE'}_${log.created}.log`);
  }

}
