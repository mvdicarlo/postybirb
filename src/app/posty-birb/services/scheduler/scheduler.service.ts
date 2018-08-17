import { Injectable } from '@angular/core';
import { interval } from 'rxjs/observable/interval';
import { Store } from '@ngxs/store';

import { SubmissionArchive } from '../../../commons/models/posty-birb/posty-birb-submission';
import { PostyBirbStateAction } from '../../stores/states/posty-birb.state';
import { SubmissionStatus } from '../../enums/submission-status.enum';

@Injectable({
  providedIn: 'root'
})
export class SchedulerService {

  private submissions: SubmissionArchive[] = [];

  constructor(private _store: Store) {
    _store.select(state => state.postybirb.submissions).subscribe((queued: SubmissionArchive[]) => {
      this.submissions = (queued || []).filter(archive => archive.meta.schedule).sort((a, b) => {
        const aDate = new Date(a.meta.schedule);
        const bDate = new Date(b.meta.schedule);

        if (aDate < bDate) return -1;
        if (aDate > bDate) return 1;
        return 0;
      });
    });

    interval(60000).subscribe(() => {
      const now = new Date();
      for (let i = 0; i < this.submissions.length; i++) {
        const s = this.submissions[i];
        const status = s.meta.submissionStatus;
        if (!(status === SubmissionStatus.QUEUED || status === SubmissionStatus.POSTING)) {
          const sTime: Date = new Date(s.meta.schedule);
          if (sTime <= now) {
            this._store.dispatch(new PostyBirbStateAction.QueueSubmission(s));
          }
        }
      }
    });
  }
}
