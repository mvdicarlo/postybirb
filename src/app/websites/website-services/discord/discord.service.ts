import { Injectable } from '@angular/core';
import { Website } from '../../decorators/website-decorator';
import { PlaintextParser } from 'src/app/utils/helpers/description-parsers/plaintext.parser';
import { BaseWebsiteService } from '../base-website-service';
import { DiscordLoginDialog } from './components/discord-login-dialog/discord-login-dialog.component';
import { WebsiteStatus, LoginStatus, SubmissionPostData, PostResult } from '../../interfaces/website-service.interface';
import { MBtoBytes, fileAsBlob } from 'src/app/utils/helpers/file.helper';
import { Submission, SubmissionFormData } from 'src/app/database/models/submission.model';
import { getDescription } from '../../helpers/website-validator.helper';
import { DiscordSubmissionForm } from './components/discord-submission-form/discord-submission-form.component';
import * as dotProp from 'dot-prop';
import { HttpClient } from '@angular/common/http';
import { SubmissionType } from 'src/app/database/tables/submission.table';

export interface DiscordWebhook {
  webhook: string;
  name: string;
}

function submissionValidate(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];

  const options = dotProp.get(formData, 'Discord.options', {});
  if (!options.webhooks || (options.webhooks && !options.webhooks.length)) {
    problems.push(['Options are incomplete', { website: 'Discord' }]);
  }

  if (submission.submissionType !== SubmissionType.JOURNAL && MBtoBytes(8) < submission.fileInfo.size) {
    problems.push(['Max file size', { website: 'Discord', value: '8MB' }]);
  }

  return problems;
}

function descriptionPreparse(html: string): string {
  if (!html) return '';
  return html
    .replace(/(<b>|<strong>)/gm, '**')
    .replace(/(<\/b>|<\/strong>)/gm, '**')
    .replace(/(<i>|<em>)/gm, '*')
    .replace(/(<\/i>|<\/em>)/gm, '*');
}

function descriptionParse(html: string): string {
  const links = html.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gm) || [];
  const seenLinks = [];
  links.forEach(link => {
    if (seenLinks.includes(link)) return;
    seenLinks.push(link);
    html = html.replace(new RegExp(link, 'gi'), `<${link}>`);
  });
  return html;
}

function warningCheck(submission: Submission, formData: SubmissionFormData): string {
  const description: string = PlaintextParser.parse(getDescription(submission, Discord.name) || '');
  if (description && description.length > 2000) {
    return Discord.name;
  }

  return null;
}

@Injectable({
  providedIn: 'root'
})
@Website({
  additionalFiles: true,
  login: {
    url: '',
    dialog: DiscordLoginDialog,
  },
  components: {
    submissionForm: DiscordSubmissionForm,
    journalForm: DiscordSubmissionForm
  },
  validators: {
    warningCheck,
    submission: submissionValidate,
    journal: submissionValidate
  },
  preparsers: {
    description: [descriptionPreparse]
  },
  parsers: {
    description: [PlaintextParser.parse, descriptionParse],
  }
})
export class Discord extends BaseWebsiteService {
  private webhooks: DiscordWebhook[] = [];
  private readonly STORE_KEY: string = 'DISCORD_WEBHOOKS';

  constructor(private http: HttpClient) {
    super();
    this.webhooks = store.get(this.STORE_KEY) || [];
  }

  public async checkStatus(profileId: string, data?: any): Promise<WebsiteStatus> {
    const returnValue: WebsiteStatus = {
      username: null,
      status: LoginStatus.LOGGED_OUT
    };

    if (this.webhooks.length) {
      returnValue.username = `${this.webhooks.length} Webhooks`;
      returnValue.status = LoginStatus.LOGGED_IN;
    }

    return returnValue;
  }

  public addWebhook(webhook: DiscordWebhook): boolean {
    const index = this.webhooks.findIndex(wh => wh.webhook === webhook.webhook);
    if (index === -1) {
      this.webhooks.push(webhook);
      store.set(this.STORE_KEY, this.webhooks);
      return true;
    }

    return false;
  }

  public removeWebhook(webhookURL: string): void {
    const index = this.webhooks.findIndex(wh => wh.webhook === webhookURL);
    if (index !== -1) {
      this.webhooks.splice(index, 1);
      store.set(this.STORE_KEY, this.webhooks);
    }
  }

  public getWebhooks(): DiscordWebhook[] {
    return [...this.webhooks.sort((a, b) => {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    })];
  }

  public async post(submission: Submission, postData: SubmissionPostData): Promise<PostResult> {
    const webhooks: string[] = postData.options.webhooks.map(wh => {
      if (typeof wh === 'object') { // support legacy for now
        return wh.webhook;
      }

      return wh; // assumed to be string
    });
    const description = (postData.description || '').substring(0, 2000);
    const files: File[] = [postData.primary, ...postData.additionalFiles]
      .filter(f => !!f)
      .map(f => new File([fileAsBlob(f)], f.fileInfo.name));

    try {
      const posted = await Promise.all(webhooks.map(wh => this.postToWebhook(wh, description, files)));
      return this.createPostResponse(null);
    } catch (e) {
      return Promise.reject(this.createPostResponse('Webhook failure', e));
    }
  }

  private async postToWebhook(webhook: string, description: string, files: File[]): Promise<any> {
    let hasAppended: boolean = false;

    if (files.length) {
      for (let i = 0; i < files.length; i++) {
        const data: FormData = new FormData();
        if (!hasAppended) {
          data.set('content', description);
          hasAppended = true;
        }
        data.set('file', files[i]);
        await this.createPost(webhook, data)
      }
    } else { // JOURNAL
      const data: FormData = new FormData();
      data.set('content', description);
      await this.createPost(webhook, data)
    }

    return true;
  }

  private createPost(webhook: string, data: FormData): Promise<any> {
    return this.http.post(webhook, data, { responseType: 'json' }).toPromise();
  }
}
