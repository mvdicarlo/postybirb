import { Injectable } from '@angular/core';
import { SubmissionDBService } from 'src/app/database/model-services/submission.service';
import { interval } from 'rxjs';
import { QueueInserterService } from './queue-inserter.service';

@Injectable({
  providedIn: 'root'
})
export class ScheduledSubmissionManagerService {

  constructor(_submissionDB: SubmissionDBService, _postQueueInserter: QueueInserterService) {
    interval(60000).subscribe(() => {
      _submissionDB.getSubmissions()
        .then(submissions => {
          const now = Date.now();
          submissions
            .filter(s => s.isScheduled)
            .filter(s => s.schedule <= now)
            .sort((a, b) => {
              const aDate = new Date(a.schedule);
              const bDate = new Date(b.schedule);

              if (aDate < bDate) return -1;
              if (aDate > bDate) return 1;
              return 0;
            })
            .forEach(s => {
              _postQueueInserter.queue(s, true);
            });
        });
    });
  }
}
