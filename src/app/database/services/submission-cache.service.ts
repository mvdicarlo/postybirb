import { Injectable } from '@angular/core';
import { CacheService } from './cache.service';
import { Subscription } from 'rxjs';
import { Submission } from '../models/submission.model';
import { validate } from 'src/app/websites/helpers/default-submission-validator.helper';

@Injectable({
  providedIn: 'root'
})
export class SubmissionCache extends CacheService {
  private _subscriptionCache: { [key: string]: Subscription } = {};
  private _updateCallback: any;

  constructor() {
    super();
  }

  public setUpdateCallback(fn: () => void): void {
    this._updateCallback = fn;
  }

  public store(submission: Submission): Submission {
    if (!super.exists(`${submission.id}`)) {
      super.store(`${submission.id}`, submission);
      this._subscriptionCache[submission.id] = submission.changes.subscribe(change => {
        if (change.validate) {
          const problems = validate(submission);
          submission.problems = problems;
        }

        Object.keys(change).filter(key => !change[key].noUpdate).forEach(key => this._updateCallback(submission.id, key, change[key].current));
      }, (err) => console.error(err), () => {
        this.remove(submission);
      });
    }

    return this.get(`${submission.id}`);
  }

  public remove(submission: Submission|number): void {
    const id: any = typeof submission === 'number' ? submission : submission.id
    super.remove(`${id}`);
    if (this._subscriptionCache[id]) {
      this._subscriptionCache[id].unsubscribe();
      delete this._subscriptionCache[id];
    }
  }

}
