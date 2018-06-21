import { Component, OnInit } from '@angular/core';
import { Log } from '../../interfaces/log';
import { LogName } from '../../enums/log-name.enum';
import { LogType } from '../../enums/log-type.enum';
import { LoggerService } from '../../services/logger/logger.service';

import { DataSource } from '@angular/cdk/collections';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';

@Component({
  selector: 'postybirb-post-logs',
  templateUrl: './postybirb-post-logs.component.html',
  styleUrls: ['./postybirb-post-logs.component.css']
})
export class PostybirbPostLogsComponent implements OnInit {
  private logName: LogName = LogName.PB_POST_LOG;
  public logs = new Data([]);
  public displayedColumns: string[] = ['time', 'title', 'rating', 'type']

  constructor(private logger: LoggerService) { }

  ngOnInit() {
    this.getLogs();
  }

  clearLogs(): void {
    this.logger.clear(this.logName);
    this.getLogs();
  }

  private getLogs(): void {
    this.logs = new Data(this.logger.get(this.logName));
  }

}

export class Data extends DataSource<Log> {
  logs: Log[] = [];

  constructor(data: Log[]) {
    super();
    this.logs = data || [];
  }

  /** Connect function called by the table to retrieve one stream containing the data to render. */
  connect(): Observable<Log[]> {
    return Observable.of(this.logs);
  }

  disconnect() { }
}
