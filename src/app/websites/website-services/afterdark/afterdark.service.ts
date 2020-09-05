import { Injectable } from '@angular/core';
import { Website } from '../../decorators/website-decorator';
import { BaseWebsiteService } from '../base-website-service';
import { WebsiteService, WebsiteStatus, LoginStatus, SubmissionPostData, PostResult } from '../../interfaces/website-service.interface';
import { Submission, SubmissionFormData } from 'src/app/database/models/submission.model';
import { AfterDarkSubmissionForm } from './components/afterdark-submission-form/afterdark-submission-form.component';
import { SubmissionType, SubmissionRating } from 'src/app/database/tables/submission.table';
import { LoginProfileManagerService } from 'src/app/login/services/login-profile-manager.service';
import { fileAsFormDataObject } from 'src/app/utils/helpers/file.helper';
import { TypeOfSubmission } from 'src/app/utils/enums/type-of-submission.enum';
import { Folder } from '../../interfaces/folder.interface';
import { getTags } from '../../helpers/website-validator.helper';
import * as dotProp from 'dot-prop';

const ACCEPTED_FILES = ['png', 'jpeg', 'jpg'];

function submissionValidate(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];
  const tags = getTags(submission, AfterDark.name);
  if (tags.length < 2) {
    problems.push(['Requires minimum tags', { website: 'AfterDark', value: 2 }]);
  }
  const collections = dotProp.get(formData, 'AfterDark.options.folders', []);
  if (collections.length < 1) {
    problems.push(['AfterDark requires at least one collection folder']);
  }
  return problems;
}

@Injectable({
  providedIn: 'root'
})
@Website({
  acceptedFiles: ACCEPTED_FILES,
  additionalFiles: false,
  displayedName: 'AfterDark',
  login: {
    url: 'https://afterdark.art/login',
  },
  components: {
    submissionForm: AfterDarkSubmissionForm,
  },
  validators: {
    submission: submissionValidate
  },
  preparsers: {},
  parsers: {
    description: [(html: string) => html],
  },
})
export class AfterDark extends BaseWebsiteService implements WebsiteService {
  readonly BASE_URL: string = 'https://afterdark.art';

  constructor(private _profileManager: LoginProfileManagerService) {
    super();
  }

  private async getCsrfToken(profileId: string): Promise<string> {
    var cookies = await getCookies(profileId, this.BASE_URL);
    const response = await got.get(this.BASE_URL, this.BASE_URL, cookies, profileId);
    if (response.statusCode !== 200) {
      throw new Error(`Bad response getting csrf token ${response.statusCode}`);
    }
    const match = response.body.match(/name="csrfmiddlewaretoken" value="([^"]+)"/);
    if (!match) {
      throw new Error('Could not find csrf token in body');
    }
    const csrfToken = match[1];
    return csrfToken;
  }

  private async getUserData(profileId: string, csrfToken: string): Promise<any> {
    const body = JSON.stringify({
      "operationName": "UserQuery",
      "variables": {},
      "query": `query UserQuery {
        userViewer {
          user {
            id
            username
            isUserAdmin
            isProUser
            isEmailVerified
            collectionSet {
              edges {
                node {
                  id
                  title
                }
              }
            }
          }
        }
      }`
    });
    var cookies = await getCookies(profileId, this.BASE_URL);
    const response = await got.gotPostJSON(`${this.BASE_URL}/graphql/`, body, this.BASE_URL, cookies, profileId, {
      headers: {
        'content-type': 'application/json',
        'X-CSRFToken': csrfToken,
      }
    });
    if (response.statusCode !== 200) {
      throw new Error(`Bad response getting user data ${response.statusCode}`);
    }
    const responseBody = JSON.parse(response.body);
    if (!(responseBody.data || {}).userViewer) {
      return null;
    }
    const collections = ((((responseBody.data || {}).userViewer || {}).user || {}).collectionSet || {}).edges || [];
    return {
      'userId': (((responseBody.data || {}).userViewer || {}).user || {}).id || '',
      'username': (((responseBody.data || {}).userViewer || {}).user || {}).username || '',
      'collections': collections.map(c => c.node),
    };
  }

  public getFolders(profileId: string): Folder[] {
    // conveniently, collections have the same structure as folders
    return this._profileManager.getData(profileId, AfterDark.name).collections;
  }

  public async checkStatus(profileId: string, data?: any): Promise<WebsiteStatus> {
    const returnValue: WebsiteStatus = {
      username: null,
      status: LoginStatus.LOGGED_OUT,
    };
    const csrfToken = await this.getCsrfToken(profileId);
    const userData = await this.getUserData(profileId, csrfToken);
    if (!userData) {
      return returnValue;
    }
    this._profileManager.storeData(profileId, AfterDark.name, userData);
    returnValue.username = userData.username;
    returnValue.status = LoginStatus.LOGGED_IN;
    return returnValue;
  }

  public async post(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    if (submission.submissionType !== SubmissionType.SUBMISSION) {
      throw new Error('Submissions only.')
    }
    if (postData.typeOfSubmission != TypeOfSubmission.ART) {
      throw new Error('Art submissions only.');
    }
    const cookies = await getCookies(postData.profileId, this.BASE_URL);
    const csrfToken = await this.getCsrfToken(postData.profileId);
    const fileFormData = fileAsFormDataObject(postData.primary);
    const query = `mutation UploadImageMutation(
      $filename: String!,
      $tags: [String],
      $collectionIds: [ID],
      $title: String,
      $artistUrl: String,
      $artistName: String,
      $nsfw: Boolean = true,
      $claimedByUser: Boolean
    ) {
      uploadImage(
        filename: $filename,
        tags: $tags,
        collectionIds: $collectionIds,
        title: $title,
        artistName: $artistName,
        artistUrl: $artistUrl,
        nsfw: $nsfw,
        claimedByUser: $claimedByUser
      ) {
        ok
        image {
          id
        }
      }
    }`;
    const variables = JSON.stringify({
      "filename": postData.primary.fileInfo.name,
      "tags": postData.tags,
      "collectionIds": postData.options.folders,
      "title": postData.title,
      "artistName": this._profileManager.getData(postData.profileId, AfterDark.name).username,
      "artistUrl": "",
      "nsfw": postData.rating !== SubmissionRating.GENERAL && postData.rating !== SubmissionRating.MATURE,
      "claimedByUser": true,
    });
    var formData = {
      query,
      variables,
    };
    formData[postData.primary.fileInfo.name] = fileFormData;
    const response = await got.post(`${this.BASE_URL}/graphql/`, formData, this.BASE_URL, cookies, {
      headers: {
        'content-type': 'multipart/form-data',
        'X-CSRFToken': csrfToken,
      }
    });
    if (response.error) {
      return this.createPostResponse('Error', response.error);
    }
    return this.createPostResponse(null);
  }
}
