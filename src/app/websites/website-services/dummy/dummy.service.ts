import $ from 'jquery';

import { Injectable } from '@angular/core';
import { BaseWebsiteService } from '../base-website-service';
import { Website } from '../../decorators/website-decorator';
import { PlaintextParser } from 'src/app/utils/helpers/description-parsers/plaintext.parser';
import { supportsFileType } from '../../helpers/website-validator.helper';
import { SubmissionRating, SubmissionType } from 'src/app/database/tables/submission.table';
import { Submission, SubmissionFormData } from 'src/app/database/models/submission.model';
import { LoginStatus, WebsiteStatus, SubmissionPostData, PostResult } from '../../interfaces/website-service.interface';
import { DummySubmissionForm } from './components/dummy-submission-form/dummy-submission-form.component';
import { fileAsFormDataObject } from 'src/app/utils/helpers/file.helper';

function submissionValidate(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];

  console.log("valid Submission", submission)

  if (submission.rating && submission.rating !== SubmissionRating.GENERAL) {
    problems.push(['Does not support rating', { website: 'Dummy', value: submission.rating }]);
  }

  if (!supportsFileType(submission.fileInfo, ['jpeg', 'jpg', 'png'])) {
    problems.push(['Does not support file format', { website: 'Dummy', value: submission.fileInfo.type }]);
  }

  return problems;
}


@Injectable({
  providedIn: 'root'
})
@Website({
  displayedName: 'Dummy',
  login: {
    url: 'http://localhost:8080/dummy/api/login'
  },
  components: {
    submissionForm: DummySubmissionForm,
    journalForm: DummySubmissionForm
  },
  validators: {
    submission: submissionValidate
  },
  parsers: {
    description: [],
  }
})
export class Dummy extends BaseWebsiteService {
  readonly BASE_URL: string = 'http://localhost:8080';

  constructor() {
    super();
  }


  public async checkStatus(profileId: string): Promise<WebsiteStatus> {
    const returnValue: WebsiteStatus = {
      username: null,
      status: LoginStatus.LOGGED_OUT
    };

    console.log('checkStatus Dummy', profileId);

    try {
        returnValue.status = LoginStatus.LOGGED_IN;

        returnValue.username = 'Test';
        this.userInformation.set(profileId, {
          id: 0
        });
    } catch (e) { /* No important error handling */ }

    return returnValue;
  }


  public post(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    if (submission.submissionType === SubmissionType.SUBMISSION) {
      return this.postSubmission(submission, postData);
    } else if (submission.submissionType === SubmissionType.JOURNAL) {
      return this.postJournal(submission, postData);
    } else {
      throw new Error('Unknown submission type.');
    }
  }

  private async postJournal(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    const data = {
      blogPostTitle: postData.title,
      blogPostBody: postData.description,
      tags: this.formatTags(postData.tags, []).join(','),
    };

    console.log('postJournal Dummy', data);

    return this.createPostResponse(null);
  }

  private async postSubmission(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    const info = this.userInformation.get(postData.profileId);

    const data: any = {
      title: postData.title,
      description: PlaintextParser.parse(postData.description),
      file: fileAsFormDataObject(postData.primary),
      info: info,
    };

    console.log('postSubmission Dummy', data);

    return this.createPostResponse(null);
  }
}
