import { Injectable } from '@angular/core';
import { CacheService } from './cache.service';
import { Subscription } from 'rxjs';
import { Submission } from '../models/submission.model';
import { SubmissionDBService } from '../model-services/submission.service';

@Injectable({
  providedIn: 'root'
})
export class SubmissionCache extends CacheService {
  private _subscriptionCache: { [key: string]: Subscription } = {};

  constructor(private _submissionDB: SubmissionDBService) {
    super();
  }

  public store(submission: Submission): Submission {
    if (!super.exists(`${submission.id}`)) {
      super.store(`${submission.id}`, submission);
      this._subscriptionCache[submission.id] = submission.changes.subscribe(change => {
        if (change.validate) {
          // TODO
        }

        Object.keys(change).filter(key => !change[key].noUpdate).forEach(key => this._submissionDB.update(submission.id, key, change[key].current));
      }, (err) => console.error(err), () => {
        this.remove(submission);
      });
    }

    return this.get(`${submission.id}`);
  }

  public remove(submission: Submission): void {
    super.remove(`${submission.id}`);
    this._subscriptionCache[submission.id].unsubscribe();
    delete this._subscriptionCache[submission.id];
  }

  public async getOrInitialize(id: number): Promise<Submission> {
    if (super.exists(`${id}`)) {
      return this.get(`${id}`);
    } else {
      const submission = await this._submissionDB.getSubmissionById(id);
      if (submission) {
        return this.store(submission);
      } else {
        console.error('Unable to find submission', id);
      }

      return null;
    }
  }
}
