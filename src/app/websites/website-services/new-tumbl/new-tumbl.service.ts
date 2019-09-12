import { Injectable } from '@angular/core';
import { Submission, SubmissionFormData } from 'src/app/database/models/submission.model';
import { BaseWebsiteService } from '../base-website-service';
import { Website } from '../../decorators/website-decorator';
import { WebsiteStatus, LoginStatus, SubmissionPostData, PostResult } from '../../interfaces/website-service.interface';
import { NewTumblSubmissionForm } from './components/new-tumbl-submission-form/new-tumbl-submission-form.component';
import { supportsFileType } from '../../helpers/website-validator.helper';
import { SubmissionType, SubmissionRating } from 'src/app/database/tables/submission.table';
import { fileAsFormDataObject } from 'src/app/utils/helpers/file.helper';
import { TypeOfSubmission } from 'src/app/utils/enums/type-of-submission.enum';

function submissionValidate(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];
  if (!supportsFileType(submission.fileInfo, ['jpeg', 'jpg', 'png', 'gif', 'mp4'])) {
    problems.push(['Does not support file format', { website: 'newTumbl', value: submission.fileInfo.type }]);
  }

  if (submission.additionalFileInfo && submission.additionalFileInfo.length) {
    submission.additionalFileInfo
      .filter(info => !supportsFileType(info, ['jpeg', 'jpg', 'png', 'gif', 'mp4'])) // technically wrong since mp4 isn't included but blame translations
      .forEach(info => problems.push(['Does not support file format', { website: 'Mastodon', value: info.type }]));
  }

  return problems;
}

function descriptionParse(html: string): string {
  return html
    .replace(/<div/gm, '<p')
    .replace(/<\/div>/gm, '</p>');
}

@Injectable({
  providedIn: 'root'
})
@Website({
  additionalFiles: true,
  displayedName: 'newTumbl',
  login: {
    url: 'https://newtumbl.com/'
  },
  components: {
    submissionForm: NewTumblSubmissionForm,
    journalForm: NewTumblSubmissionForm
  },
  validators: {
    submission: submissionValidate
  },
  parsers: {
    description: [descriptionParse],
    usernameShortcut: {
      code: 'nt',
      url: 'https://$1.newtumbl.com'
    }
  }
})
export class NewTumbl extends BaseWebsiteService {
  public BASE_URL: string = 'https://newtumbl.com';
  private API_URL: string = 'https://api-rw.newtumbl.com/sp/NewTumbl';

  constructor() {
    super();
  }

  public async checkStatus(profileId: string): Promise<WebsiteStatus> {
    const returnValue: WebsiteStatus = {
      username: null,
      status: LoginStatus.LOGGED_OUT
    };

    const loginToken = await this.getLoginToken(profileId);
    if (loginToken) {
      try {
        const response = await got.post(`${this.API_URL}/get_User_Settings`, null, this.BASE_URL, [], {
          form: {
            json: JSON.stringify({
              Params: ["[{IPADDRESS}]", loginToken]
            })
          }
        });

        const json = JSON.parse(response.success.body);
        if (json.nResult === '0') {
          returnValue.status = LoginStatus.LOGGED_IN;
          returnValue.username = json.aResultSet[0].aRow[0].szEmailId;
          await this._getBlogs(profileId);
        }
      } catch (e) { }
    }

    return returnValue;
  }

  private async _getBlogs(profileId: string): Promise<void> {
    const cookies = await getCookies(profileId, this.BASE_URL);
    const res = await got.get(`${this.BASE_URL}/blogs`, this.BASE_URL, cookies, null);
    const json = JSON.parse(res.body.match(/Data_Session.*?{(\s|.)*?;/g)[0].replace(';', '').split('= ')[1]);
    const sets = json.aResultSet || [];
    const blogs: any[] = [];
    for (let i = 0; i < sets.length; i++) {
      const set = sets[i];
      if (set.aRow.length) {
        for (let i = 0; i < set.aRow.length; i++) {
          const row = set.aRow[i];
          if (row.szBlogId) {
            blogs.push({
              name: row.szBlogId,
              id: row.dwBlogIx,
              primary: !!row.bPrimary
            });
          }
        }
      }
    }

    this.userInformation.set(profileId, { blogs });
  }

  public getBlogs(profileId: string): any[] {
    return (this.userInformation.get(profileId) || {}).blogs || [];
  }

  private async getLoginToken(profileId: string): Promise<string> {
    const cookies = await getCookies(profileId, this.BASE_URL);
    for (let i = 0; i < cookies.length; i++) {
      if (cookies[i].name === 'LoginToken') return cookies[i].value;
    }
  }

  private getDefaultBlog(profileId: string): any {
    return this.getBlogs(profileId).filter(blog => blog.primary)[0];
  }

  private getRating(rating: SubmissionRating, override: string): string {
    if (override) return override;
    if (rating === SubmissionRating.GENERAL) return '1';
    if (rating === SubmissionRating.MATURE) return '3';
    if (rating === SubmissionRating.ADULT) return '4';
    if (rating === SubmissionRating.EXTREME) return '5';
    return '1';
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

  public async postSubmission(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    let postType: number = 5;
    if (postData.typeOfSubmission === TypeOfSubmission.ANIMATION) {
      postType = 7;
    }
    const loginToken: string = await this.getLoginToken(postData.profileId);
    const options = postData.options;
    const blog: any = options.blog ? options.blog : this.getDefaultBlog(postData.profileId).id;
    const compose = await got.post(`${this.API_URL}/set_Post_Compose`, null, this.BASE_URL, [], {
      form: {
        json: JSON.stringify({
          Params: ["[{IPADDRESS}]", loginToken, blog, postType]
        })
      }
    });

    if (compose.error) {
      return Promise.reject(this.createPostResponse('Unknown error', compose.error));
    }

    let json: any = JSON.parse(compose.success.body);
    if (json.nResult !== '0') {
      return Promise.reject(this.createPostResponse('Unknown error', compose.success.body));
    }

    const postId: number = json.aResultSet[0].aRow[0].qwPostIx;

    const getCompose = await got.post(`${this.API_URL}/get_Post_Compose`, null, this.BASE_URL, [], {
      form: {
        json: JSON.stringify({
          Params: ["[{IPADDRESS}]", loginToken, 0, postId]
        })
      }
    });

    if (getCompose.error) {
      return Promise.reject(this.createPostResponse('Unknown error', getCompose.error));
    }

    json = JSON.parse(getCompose.success.body);
    if (json.nResult !== '0') {
      return Promise.reject(this.createPostResponse('Unknown error', getCompose.success.body));
    }

    const files: any[] = [postData.primary, ...(postData.typeOfSubmission === TypeOfSubmission.ART ? postData.additionalFiles : [])]
      .filter(f => !!f)
      .map(f => fileAsFormDataObject(f));
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const upload = await got.post(`https://up0.newtumbl.com/sba/${loginToken}`, { image_file: file }, '', []);
      if (upload.error) {
        return Promise.reject(this.createPostResponse('Unknown error', upload.error));
      }

      const res = JSON.parse(upload.success.body);
      if (res.aResults[0].sError) {
        return Promise.reject(this.createPostResponse('Failed to upload a file', upload.success.body));
      }

      const id: number = res.aResults[0].qwMediaIx || res.aResults[0].qwPartIx;
      const insert = await got.post(`${this.API_URL}/set_PostPart_Insert`, null, this.BASE_URL, [], {
        form: {
          json: JSON.stringify({
            Params: ["[{IPADDRESS}]", loginToken, 0, postId, postType, '', '', id]
          })
        }
      });

      if (insert.error) {
        return Promise.reject(this.createPostResponse('Unknown error', insert.error));
      }

      const json = JSON.parse(insert.success.body);
      if (json.nResult !== '0') {
        return Promise.reject(this.createPostResponse('Unknown error', insert.success.body));
      }
    }

    for (let i = 0; i < files.length; i++) {
      const update = await got.post(`${this.API_URL}/set_PostPart_Update`, null, this.BASE_URL, [], {
        form: {
          json: JSON.stringify({
            Params: ["[{IPADDRESS}]", loginToken, 0, postId, i + 1, '', '']
          })
        }
      });

      if (update.error) {
        return Promise.reject(this.createPostResponse('Unknown error', update.error));
      }

      const json = JSON.parse(update.success.body);
      if (json.nResult !== '0') {
        return Promise.reject(this.createPostResponse('Unknown error', update.success.body));
      }
    }

    const rating: string = this.getRating(submission.rating, options.ratingOverride);
    const tags: string = postData.tags.map(t => `#${t}`).join('');

    const postPart = await got.post(`${this.API_URL}/set_PostPart_Update`, null, this.BASE_URL, [], {
      form: {
        json: JSON.stringify({
          Params: ["[{IPADDRESS}]", loginToken, 0, postId, 0, postData.description, '']
        })
      }
    });

    if (postPart.error) {
      return Promise.reject(this.createPostResponse('Unknown error', postPart.error));
    }

    json = JSON.parse(postPart.success.body);
    if (json.nResult !== '0') {
      return Promise.reject(this.createPostResponse('Unknown error', postPart.success.body));
    }

    const postOptions = await got.post(`${this.API_URL}/set_Post_Options`, null, this.BASE_URL, [], {
      form: {
        json: JSON.stringify({
          Params: ["[{IPADDRESS}]", loginToken, 0, postId, rating, '', '', tags]
        })
      }
    });

    if (postOptions.error) {
      return Promise.reject(this.createPostResponse('Unknown error', postOptions.error));
    }

    json = JSON.parse(postOptions.success.body);
    if (json.nResult !== '0') {
      return Promise.reject(this.createPostResponse('Unknown error', postOptions.success.body));
    }

    const postComplete = await got.post(`${this.API_URL}/set_Post_Complete`, null, this.BASE_URL, [], {
      form: {
        json: JSON.stringify({
          Params: ["[{IPADDRESS}]", loginToken, 0, postId]
        })
      }
    });

    if (postComplete.error) {
      return Promise.reject(this.createPostResponse('Unknown error', postComplete.error));
    }

    json = JSON.parse(postComplete.success.body);
    if (json.nResult !== '0') {
      return Promise.reject(this.createPostResponse('Unknown error', postComplete.success.body));
    }

    const postPublish = await got.post(`${this.API_URL}/set_Post_Publish`, null, this.BASE_URL, [], {
      form: {
        json: JSON.stringify({
          Params: ["[{IPADDRESS}]", loginToken, postId]
        })
      }
    });

    if (postPublish.error) {
      return Promise.reject(this.createPostResponse('Unknown error', postPublish.error));
    }

    json = JSON.parse(postPublish.success.body);
    if (json.nResult !== '0') {
      return Promise.reject(this.createPostResponse('Unknown error', postPublish.success.body));
    }

    return this.createPostResponse(null);
  }

  public async postJournal(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    const loginToken: string = await this.getLoginToken(postData.profileId);
    const options = postData.options;
    const blog: any = options.blog ? options.blog : this.getDefaultBlog(postData.profileId).id;
    const compose = await got.post(`${this.API_URL}/set_Post_Compose`, null, this.BASE_URL, [], {
      form: {
        json: JSON.stringify({
          Params: ["[{IPADDRESS}]", loginToken, blog, 1]
        })
      }
    });

    if (compose.error) {
      return Promise.reject(this.createPostResponse('Unknown error', compose.error));
    }

    let json: any = JSON.parse(compose.success.body);
    if (json.nResult !== '0') {
      return Promise.reject(this.createPostResponse('Unknown error', compose.success.body));
    }

    const postId: number = json.aResultSet[0].aRow[0].qwPostIx;

    const getCompose = await got.post(`${this.API_URL}/get_Post_Compose`, null, this.BASE_URL, [], {
      form: {
        json: JSON.stringify({
          Params: ["[{IPADDRESS}]", loginToken, 0, postId]
        })
      }
    });

    if (getCompose.error) {
      return Promise.reject(this.createPostResponse('Unknown error', getCompose.error));
    }

    json = JSON.parse(getCompose.success.body);
    if (json.nResult !== '0') {
      return Promise.reject(this.createPostResponse('Unknown error', getCompose.success.body));
    }

    const rating: string = this.getRating(submission.rating, options.ratingOverride);
    const tags: string = postData.tags.map(t => `#${t}`).join('');

    const postPart = await got.post(`${this.API_URL}/set_PostPart_Update`, null, this.BASE_URL, [], {
      form: {
        json: JSON.stringify({
          Params: ["[{IPADDRESS}]", loginToken, 0, postId, 0, postData.description, `<p>${postData.title}</p>`]
        })
      }
    });

    if (postPart.error) {
      return Promise.reject(this.createPostResponse('Unknown error', postPart.error));
    }

    json = JSON.parse(postPart.success.body);
    if (json.nResult !== '0') {
      return Promise.reject(this.createPostResponse('Unknown error', postPart.success.body));
    }

    const postOptions = await got.post(`${this.API_URL}/set_Post_Options`, null, this.BASE_URL, [], {
      form: {
        json: JSON.stringify({
          Params: ["[{IPADDRESS}]", loginToken, 0, postId, rating, '', '', tags]
        })
      }
    });

    if (postOptions.error) {
      return Promise.reject(this.createPostResponse('Unknown error', postOptions.error));
    }

    json = JSON.parse(postOptions.success.body);
    if (json.nResult !== '0') {
      return Promise.reject(this.createPostResponse('Unknown error', postOptions.success.body));
    }

    const postComplete = await got.post(`${this.API_URL}/set_Post_Complete`, null, this.BASE_URL, [], {
      form: {
        json: JSON.stringify({
          Params: ["[{IPADDRESS}]", loginToken, 0, postId]
        })
      }
    });

    if (postComplete.error) {
      return Promise.reject(this.createPostResponse('Unknown error', postComplete.error));
    }

    json = JSON.parse(postComplete.success.body);
    if (json.nResult !== '0') {
      return Promise.reject(this.createPostResponse('Unknown error', postComplete.success.body));
    }

    const postPublish = await got.post(`${this.API_URL}/set_Post_Publish`, null, this.BASE_URL, [], {
      form: {
        json: JSON.stringify({
          Params: ["[{IPADDRESS}]", loginToken, postId]
        })
      }
    });

    if (postPublish.error) {
      return Promise.reject(this.createPostResponse('Unknown error', postPublish.error));
    }

    json = JSON.parse(postPublish.success.body);
    if (json.nResult !== '0') {
      return Promise.reject(this.createPostResponse('Unknown error', postPublish.success.body));
    }

    return this.createPostResponse(null);
  }

}
