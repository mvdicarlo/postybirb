import { Injectable } from '@angular/core';
import { Log } from '../../interfaces/log';
import { LogType } from '../../enums/log-type.enum';
import { LogName } from '../../enums/log-name.enum';

import { MatSnackBar } from '@angular/material';
import { saveAs } from 'file-saver';

@Injectable()
export class LoggerService {
  private logMap: Map<LogName, Log[]>;

  constructor(private snackBar: MatSnackBar) {
    this.logMap = new Map();
  }

  public log(logName: LogName, logLevel: LogType, data: any, reason?: string, report: boolean = false): void {
    if (this.isValidLogLevel(logLevel)) {
      const log: Log = {
        time: new Date(),
        level: logLevel,
        data: Object.assign({}, data),
        reason
      };

      const logs: Log[] = this.logMap.get(logName) || [];
      logs.push(log);
      this.logMap.set(logName, logs);

      if (report) {
        this.generateReport(logLevel, data, logName);
      }
    } else {
      console.error(`Invalid log level ${logLevel}`);
    }
  }

  public debug(logName: LogName, data: any, reason?: string, report: boolean = false): void {
    this.log(logName, LogType.DEBUG, data, reason, report);
  }

  public info(logName: LogName, data: any, reason?: string, report: boolean = false): void {
    this.log(logName, LogType.INFO, data, reason, report);
  }

  public warn(logName: LogName, data: any, reason?: string, report: boolean = false): void {
    this.log(logName, LogType.WARN, data, reason, report);
  }

  public error(logName: LogName, data: any, reason?: string, report: boolean = true): void {
    this.log(logName, LogType.ERROR, data, reason, report);
  }

  public clear(logName: LogName): void {
    this.logMap.delete(logName);
  }

  public get(logName: LogName, levelFilter?: LogType): Log[] {
    const storedLog = this.logMap.get(logName) || [];
    let logs: Log[] = [...storedLog];

    if (logs.length > 1 && levelFilter) {
      logs = this.filter(logs, levelFilter);
    }

    if (logs.length > 1) {
      logs = this.sort(logs);
    }

    return logs;
  }

  private sort(logs: Array<Log>): Array<Log> {
    const logArr: Log[] = [...logs];
    logArr.sort((a, b) => {
      if (a.time < b.time) {
        return -1;
      } else if (a.time > b.time) {
        return 1;
      }

      return 0;
    });

    return logArr;
  }

  private filter(logs: Log[], logLevel: LogType): Log[] {
    return logs.filter(log => log.level === logLevel);
  }

  private isValidLogLevel(logLevel: LogType): boolean {
    return logLevel === LogType.DEBUG || logLevel === LogType.INFO || logLevel === LogType.WARN || logLevel === LogType.ERROR;
  }

  private generateReport(logLevel: LogType, args: any = {}, logName: string = ""): void {
    const timestamp = new Date().toLocaleTimeString();
    const name = `${logLevel}_${logName}_${timestamp}.log.txt`;

    let report: any = "";

    if (args instanceof Error) {
      args = { err: args };
    }

    Object.entries(args).forEach(([key, value]) => {
      report += `${key}\n`;

      if (typeof value !== 'object') {
        report += `${value}\n`;
      } else if (value instanceof Error) {
        report += `${value.message}\n${value.stack}\n`;
      } else {
        report += `${JSON.stringify(value)}\n`;
      }
    });

    if (report.length > 0) {
      const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
      saveAs(blob, name);
      this.snackBar.open(`Log file generated (${name})`, 'OK', { duration: 5000 });
    }
  }

}
