import $ from 'jquery';

import { Injectable } from '@angular/core';
import { Website } from '../../decorators/website-decorator';
import { WebsiteService, WebsiteStatus, LoginStatus } from '../../interfaces/website-service.interface';
import { HTMLParser } from 'src/app/utils/helpers/html-parser.helper';
import { BaseWebsiteService, UserInformation } from '../base-website-service';
import { FolderCategory } from '../../interfaces/folder.interface';
import { FurAffinitySubmissionForm } from './components/fur-affinity-submission-form/fur-affinity-submission-form.component';
import { GenericJournalSubmissionForm } from '../../components/generic-journal-submission-form/generic-journal-submission-form.component';
import { BBCodeParser } from 'src/app/utils/helpers/description-parsers/bbcode.parser';
import { supportsFileType, getTags } from '../../helpers/website-validator.helper';
import { Submission, SubmissionFormData } from 'src/app/database/models/submission.model';
import { MBtoBytes } from 'src/app/utils/helpers/file.helper';

function submissionValidate(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];
  const tags = getTags(submission, FurAffinity.name);
  if (!supportsFileType(submission.fileInfo.type, ['jpg', 'gif', 'png', 'jpeg', 'jpg', 'swf', 'doc', 'docx', 'rtf', 'txt', 'pdf', 'odt', 'mid', 'wav', 'mp3', 'mpeg', 'mpg'])) {
    problems.push(['Does not support file format', { website: 'Fur Affinity', value: submission.fileInfo.type }]);
  }

  if (MBtoBytes(10) < submission.fileInfo.size) {
    problems.push(['Max file size', { website: `Fur Affinity`, value: '10MB' }]);
  }

  return problems;
}

@Injectable({
  providedIn: 'root'
})
@Website({
  postWaitInterval: 30000 * 4,
  displayedName: 'Fur Affinity',
  login: {
    url: 'https://www.furaffinity.net/login'
  },
  components: {
    submissionForm: FurAffinitySubmissionForm,
    journalForm: GenericJournalSubmissionForm
  },
  validators: {
    submission: submissionValidate
  },
  parsers: {
    description: [BBCodeParser.parse],
    usernameShortcut: {
      code: 'fa',
      url: 'https://www.furaffinity.net/user/$1'
    }
  }
})
export class FurAffinity extends BaseWebsiteService implements WebsiteService {
  readonly BASE_URL: string = 'https://www.furaffinity.net';

  constructor() {
    super();
  }

  public async checkStatus(profileId: string): Promise<WebsiteStatus> {
    const returnValue: WebsiteStatus = {
      username: null,
      status: LoginStatus.LOGGED_OUT
    };

    const cookies = await getCookies(profileId, this.BASE_URL);
    const response = await got.get(`${this.BASE_URL}/controls/submissions`, this.BASE_URL, cookies);
    try {
      const body = response.body;
      if (body.includes('logout-link')) {
        const aTags = HTMLParser.getTagsOf(body, 'a');
        const matcher = /href="\/user\/.*"/g;

        // This code is a bit messy and is marked for refactor
        if (aTags.length > 0) {
          for (let i = 0; i < aTags.length; i++) {
            let tag = aTags[i];
            if (tag.match(matcher)) {
              returnValue.username = tag.match(matcher)[0].split('/')[2] || null
              returnValue.status = LoginStatus.LOGGED_IN;
              break;
            }
          }
        }

        this._getFolders(profileId, body);
      } else {
        this.userInformation.delete(profileId);
      }
    } catch (e) { /* No important error handling */ }

    return returnValue;
  }

  private async _getFolders(profileId: string, html: string): Promise<void> {
    const info: UserInformation = {
      folders: []
    };

    try {
      const furAffinityFolders: { [key: string]: FolderCategory } = { Ungrouped: { title: 'Ungrouped', folders: [] } };
      const select = html.match(/<select(.|\s)*?(?=\/select)/g)[0] + '/select>';
      const element = $.parseHTML(select);
      let options = $(element).find('option') || [];

      for (let i = 0; i < options.length; i++) {
        const opt = options[i];

        if (opt.value === '0') continue;

        if (opt.parentElement.tagName === 'OPTGROUP') {
          if (!furAffinityFolders[opt.parentElement.label]) {
            furAffinityFolders[opt.parentElement.label] = {
              title: opt.parentElement.label,
              folders: []
            };
          }

          furAffinityFolders[opt.parentElement.label].folders.push({
            title: opt.innerHTML.replace(/\[.*\]/, '').trim(),
            id: opt.value
          });
        } else {
          furAffinityFolders.Ungrouped.folders.push({
            title: opt.innerHTML.replace(/\[.*\]/, '').trim(),
            id: opt.value
          });
        }
      }

      info.folders = Object.keys(furAffinityFolders).map(key => {
        return { title: key, folders: furAffinityFolders[key].folders };
      }) || [];
    } catch (e) { /* */ }

    this.userInformation.set(profileId, info);
    return;
  }

  public getFolders(profileId: string): FolderCategory[] {
    return this.userInformation.get(profileId).folders;
  }
}
