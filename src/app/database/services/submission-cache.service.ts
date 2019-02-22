import { Injectable } from '@angular/core';
import { CacheService } from './cache.service';
import { Subscription } from 'rxjs';
import { Submission } from '../models/submission.model';
import { validate, getAllWebsiteValidatorsForWebsites } from 'src/app/websites/helpers/website-validator.helper';

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

  private _validateSubmission(submission: Submission): void {
    let problems = validate(submission);
    if (submission.formData && submission.formData.websites) {
      getAllWebsiteValidatorsForWebsites(submission.formData.websites, submission.submissionType)
        .filter(fn => fn !== undefined)
        .forEach(validatorFn => problems = [...problems, ...validatorFn(submission, submission.formData)]);
    }

    submission.problems = problems;
  }

  public getAll(): Submission[] {
    return Object.keys(this._cache).map(key => this._cache[key]);
  }

  public store(submission: Submission): Submission {
    if (!super.exists(`${submission.id}`)) {
      super.store(`${submission.id}`, submission);
      this._subscriptionCache[submission.id] = submission.changes.subscribe(change => {
        let doValidate: boolean = false;
        for (let key of Object.keys(change)) {
          if (change[key].validate) {
            doValidate = true;
            break;
          }
        }

        if (doValidate) {
          this._validateSubmission(submission);
        }

        Object.keys(change).filter(key => !change[key].noUpdate).forEach(key => this._updateCallback(submission.id, key, change[key].current));
      }, (err) => console.error(err), () => {
        this.remove(submission);
      });

      this._validateSubmission(submission);
    }

    return this.get(`${submission.id}`);
  }

  public remove(submission: Submission | number): void {
    const id: any = typeof submission === 'number' ? submission : submission.id
    super.remove(`${id}`);
    if (this._subscriptionCache[id]) {
      this._subscriptionCache[id].unsubscribe();
      delete this._subscriptionCache[id];
    }
  }


}
