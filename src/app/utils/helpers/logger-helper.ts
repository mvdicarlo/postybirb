import {
  saveAs
} from 'file-saver';

export class Logger {
  public static output(name: string, log: any) {
    let report = typeof log === 'object' ? JSON.stringify(log, null, 1) : log;
    const blob = new Blob([report], {
      type: "text/plain;charset=utf-8"
    });
    saveAs(blob, `PB_${name}_${new Date().toUTCString()}.log`);
  }
}
