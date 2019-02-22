import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { Submission } from '../models/submission.model';

@Injectable({
  providedIn: 'root'
})
export class ScheduleWriterService {
  private subject: Subject<Submission[]> = new Subject();

  constructor() {
    this.subject.asObservable()
    .pipe(debounceTime(1000))
    .subscribe((s) => this._doUpdate(s));
  }

  public update(submissions: Submission[]): void {
    this.subject.next(submissions);
  }

  private _doUpdate(submissions: Submission[]): void {
    writeJsonToFile('scheduled-submissions', {
      scheduled: (submissions || []).filter(s => s.isScheduled).map(s => s.schedule).sort()
    });
  }
}
