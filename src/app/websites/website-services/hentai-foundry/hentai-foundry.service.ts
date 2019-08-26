import { Injectable } from '@angular/core';
import { Website } from '../../decorators/website-decorator';
import { HentaiFoundrySubmissionForm } from './components/hentai-foundry-submission-form/hentai-foundry-submission-form.component';
import { BBCodeParser } from 'src/app/utils/helpers/description-parsers/bbcode.parser';
import { BaseWebsiteService } from '../base-website-service';
import { SubmissionFormData, Submission } from 'src/app/database/models/submission.model';
import { MBtoBytes, fileAsFormDataObject } from 'src/app/utils/helpers/file.helper';
import { supportsFileType } from '../../helpers/website-validator.helper';
import { WebsiteStatus, LoginStatus, SubmissionPostData, PostResult } from '../../interfaces/website-service.interface';
import { HTMLParser } from 'src/app/utils/helpers/html-parser.helper';
import * as dotProp from 'dot-prop';
import { GenericJournalSubmissionForm } from '../../components/generic-journal-submission-form/generic-journal-submission-form.component';
import { SubmissionType } from 'src/app/database/tables/submission.table';

function submissionValidate(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];

  const options = dotProp.get(formData, `${HentaiFoundry.name}.options`, {});
  if (!options.category) {
    problems.push(['Options are incomplete', { website: 'Hentai Foundry' }]);
  }

  if (!supportsFileType(submission.fileInfo, ['jpeg', 'jpg', 'png', 'svg', 'gif'])) {
    problems.push(['Does not support file format', { website: 'Hentai Foundry', value: submission.fileInfo.type }]);
  }

  if (MBtoBytes(50) < submission.fileInfo.size) {
    problems.push(['Max file size', { website: 'Hentai Foundry', value: '50MB' }]);
  }

  return problems;
}

@Injectable({
  providedIn: 'root'
})
@Website({
  displayedName: 'Hentai Foundry',
  login: {
    url: 'https://www.hentai-foundry.com/site/login'
  },
  components: {
    submissionForm: HentaiFoundrySubmissionForm,
    journalForm: GenericJournalSubmissionForm
  },
  validators: {
    submission: submissionValidate
  },
  parsers: {
    description: [BBCodeParser.parse],
    usernameShortcut: {
      code: 'hf',
      url: 'https://www.hentai-foundry.com/user/$1'
    }
  }
})
export class HentaiFoundry extends BaseWebsiteService {
  readonly BASE_URL: string = 'https://www.hentai-foundry.com';

  constructor() {
    super();
  }

  public async checkStatus(profileId: string): Promise<WebsiteStatus> {
    const returnValue: WebsiteStatus = {
      username: null,
      status: LoginStatus.LOGGED_OUT
    };

    const cookies = await getCookies(profileId, this.BASE_URL);
    const response = await got.get(this.BASE_URL, this.BASE_URL, cookies, null);
    try {
      const body = response.body;
      if (body.includes('Logout')) {
        returnValue.status = LoginStatus.LOGGED_IN;
        returnValue.username = body.match(/\/user\/.*?(?=\/)/g)[0].split('/')[2];
      }
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
    await this.attemptSessionLoad(postData.profileId);
    const cookies = await getCookies(postData.profileId, this.BASE_URL);
    const formPage = await got.get(`${this.BASE_URL}/UserBlogs/create`, this.BASE_URL, cookies, null);

    const data: any = {
      YII_CSRF_TOKEN: HTMLParser.getInputValue(formPage.body, 'YII_CSRF_TOKEN'),
      'UserBlogs[blog_title]': postData.title,
      'UserBlogs[blog_body]': postData.description
    };

    const postResponse = await got.post(`${this.BASE_URL}/UserBlogs/create`, data, this.BASE_URL, cookies);
    if (postResponse.error) {
      return Promise.reject(this.createPostResponse('Unknown error', postResponse.error));
    }

    return this.createPostResponse(null);
  }

  private async postSubmission(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    await this.attemptSessionLoad(postData.profileId);
    const cookies = await getCookies(postData.profileId, this.BASE_URL);
    const formPage = await got.get(`${this.BASE_URL}/pictures/create`, this.BASE_URL, cookies, null);
    const options = postData.options;

    const data: any = {
      YII_CSRF_TOKEN: HTMLParser.getInputValue(formPage.body, 'YII_CSRF_TOKEN'),
      'Pictures[user_id]': HTMLParser.getInputValue(formPage.body, 'Pictures[user_id]'),
      'Pictures[title]': postData.title,
      'Pictures[description]': postData.description,
      'Pictures[fileupload]': fileAsFormDataObject(postData.primary),
      'Pictures[submissionPolicyAgree]': '1',
      'yt0': 'Create',
      'Pictures[keywords]': this.formatTags(postData.tags, []),
      'Pictures[is_scrap]': options.scraps ? '1' : '0',
      'Pictures[comments_type]': options.disableComments ? '-1' : '0',
      'Pictures[categoryHier]': options.category || '',
      'Pictures[rating_nudity]': options.nudityRating,
      'Pictures[rating_violence]': options.violenceRating,
      'Pictures[rating_profanity]': options.profanityRating,
      'Pictures[rating_racism]': options.racismRating,
      'Pictures[rating_sex]': options.sexRating,
      'Pictures[rating_spoilers]': options.spoilersRating,
      'Pictures[rating_yaoi]': options.yaoi ? '1' : '0',
      'Pictures[rating_yuri]': options.yuri ? '1' : '0',
      'Pictures[rating_teen]': options.teen ? '1' : '0',
      'Pictures[rating_guro]': options.guro ? '1' : '0',
      'Pictures[rating_furry]': options.furry ? '1' : '0',
      'Pictures[rating_beast]': options.beast ? '1' : '0',
      'Pictures[rating_male]': options.male ? '1' : '0',
      'Pictures[rating_female]': options.female ? '1' : '0',
      'Pictures[rating_futa]': options.futa ? '1' : '0',
      'Pictures[rating_other]': options.other ? '1' : '0',
      'Pictures[rating_scat]': options.scat ? '1' : '0',
      'Pictures[rating_incest]': options.incest ? '1' : '0',
      'Pictures[rating_rape]': options.rape ? '1' : '0',
      'Pictures[media_id]': options.media,
      'Pictures[time_taken]': options.timeTaken || '',
      'Pictures[reference]': options.reference || '',
      'Pictures[license_id]': '0'
    };

    const postResponse = await got.post(`${this.BASE_URL}/pictures/create`, data, this.BASE_URL, cookies);
    if (postResponse.error) {
      return Promise.reject(this.createPostResponse('Unknown error', postResponse.error));
    }

    if (!postResponse.success.body.includes('Submit new picture') && postResponse.success.body.includes('pending approval') && !postResponse.success.response.request.uri.href.includes('/create')) {
      const res = this.createPostResponse(null);
      res.srcURL = postResponse.success.response.request.uri.href;
      return res;
    } else {
      return this.createPostResponse('Unknown error', postResponse.success.body);
    }
  }

  formatTags(defaultTags: string[] = [], other: string[] = []): any {
    const maxLength = 75;
    const tags = super.formatTags(defaultTags, other);
    let tagString = tags.join(' ').trim();

    return tagString.length > maxLength ? tagString.substring(0, maxLength).split(' ').filter(tag => tag.length >= 3).join(' ') : tagString;
  }

}
