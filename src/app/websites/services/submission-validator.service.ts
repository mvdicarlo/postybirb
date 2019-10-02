import { Injectable } from '@angular/core';
import { Submission, SubmissionFormData } from 'src/app/database/models/submission.model';
import { WebsiteRegistry } from '../registries/website.registry';
import { validate } from '../helpers/website-validator.helper';
import { SubmissionType } from 'src/app/database/tables/submission.table';

@Injectable({
  providedIn: 'root'
})
export class SubmissionValidatorService {
  private warningValidators: { [key: string]: (submission: Submission, formData: SubmissionFormData) => any[] } = {};
  private submissionValidators: { [key: string]: (submission: Submission, formData: SubmissionFormData) => any[] } = {};
  private journalValidators: { [key: string]: (submission: Submission, formData: SubmissionFormData) => any[] } = {};

  constructor() {
    WebsiteRegistry.getRegisteredAsArray().forEach(registry => {
      this.warningValidators[registry.name] = registry.websiteConfig.validators.warningCheck || this._noop;
      this.submissionValidators[registry.name] = registry.websiteConfig.validators.submission || this._noop;
      this.journalValidators[registry.name] = registry.websiteConfig.validators.journal || this._noop;
    });
  }

  private _noop(submission: Submission, formData: SubmissionFormData): any[] {
    return [];
  }

  public validate(submission: Submission): void {
    let problems = validate(submission);
    let warnings = [];
    if (submission.formData && submission.formData.websites) {
      submission.formData.websites.forEach(website => {
        if (submission.submissionType === SubmissionType.SUBMISSION) {
          problems.push(...this.submissionValidators[website](submission, submission.formData));
        } else {
          problems.push(...this.journalValidators[website](submission, submission.formData));
        }
        warnings.push(...this.warningValidators[website](submission, submission.formData));
      });
    }

    submission.problems = problems;
    submission.warnings = warnings;
  }
}
