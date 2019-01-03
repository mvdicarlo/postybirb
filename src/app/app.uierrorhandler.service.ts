import { ErrorHandler, Injectable, NgZone, isDevMode } from "@angular/core";
import { HttpClient } from "@angular/common/http";

interface ErrorMessage {
  message: string;
  type: string;
  timestamp: any;
  stack?: any;
}

@Injectable()
export class UIErrorHandler extends ErrorHandler {
  constructor(private zone: NgZone, private http: HttpClient) {
    super();

    window.addEventListener('error', function(event: ErrorEvent) {
      this._logErrorToServer({
        type: event.type,
        message: event.message,
        timestamp: event.timeStamp
      });
    }.bind(this));

    window.addEventListener('unhandledrejection', function(event) {
      this._logErrorToServer({
        type: event.type,
        message: event.reason.message,
        timestamp: event.timeStamp,
        stack: event.reason.stack
      });
    }.bind(this));

    zone.onError.subscribe(err => this.handleError(err));
  }

  handleError(error) {
    super.handleError(error);
    this._logErrorToServer({
      type: 'Angular Handle Error',
      message: error.message,
      timestamp: Date.now(),
      stack: error.stack,
    });
  }

  private _logErrorToServer(error: ErrorMessage): void {
    if (isDevMode()) {
      console.log('Caught Error', error);
      alert(error.message);
    } else {
      if (error.message && !error.message.includes('ExpressionChangedAfterItHasBeenCheckedError')) {
        this.http.post('https://postybirb-error-server.now.sh/log/error', { errorLog: error })
        .subscribe(res => console.debug('Error logging success', res), err => console.debug('Error logging failure', err));
      }
    }
  }
}
