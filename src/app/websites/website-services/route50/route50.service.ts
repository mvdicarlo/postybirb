import { Injectable } from '@angular/core';
import { BaseWebsiteService } from '../base-website-service';
import { GenericSubmissionForm } from '../../components/generic-submission-form/generic-submission-form.component';
import { Website } from '../../decorators/website-decorator';
import { Submission, SubmissionFormData } from 'src/app/database/models/submission.model';
import { SubmissionRating } from 'src/app/database/tables/submission.table';
import { supportsFileType } from '../../helpers/website-validator.helper';
import { MBtoBytes } from 'src/app/utils/helpers/file.helper';
import { PlaintextParser } from 'src/app/utils/helpers/description-parsers/plaintext.parser';

function submissionValidate(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];
  if (submission.rating !== SubmissionRating.GENERAL) {
    problems.push(['Does not support rating', { website: 'Route 50', value: submission.rating }]);
  }

  if (!supportsFileType(submission.fileInfo.type, ['jpg', 'jpeg', 'png', 'gif', 'txt', 'mp3', 'midi', 'css', 'swf'])) {
    problems.push(['Does not support file format', { website: 'Route 50', value: submission.fileInfo.type }]);
  }

  if (MBtoBytes(10) < submission.fileInfo.size) {
    problems.push(['Max file size', { website: 'Route 50', value: '10MB' }]);
  }

  return problems;
}

@Injectable({
  providedIn: 'root'
})
@Website({
  displayedName: 'Route 50',
  login: {
    url: 'http://route50.net'
  },
  components: {
    submissionForm: GenericSubmissionForm
  },
  validators: {
    submission: submissionValidate
  },
  parsers: {
    description: [PlaintextParser.parse]
  }
})
export class Route50 extends BaseWebsiteService {

  constructor() {
    super();
  }
}
