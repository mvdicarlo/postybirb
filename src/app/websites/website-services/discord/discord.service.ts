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
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
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

function warningCheck(submission: Submission, formData: SubmissionFormData): any[] {
  const problems: any[] = [];
  const description: string = PlaintextParser.parse(getDescription(submission, Discord.name) || '');
  if (description && description.length > 2000) {
    problems.push(['Max description length', { website: 'Discord', value: '2000' }]);
  }

  return problems;
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
    const options = postData.options;
    const includesAd = (postData.description || '').includes('Posted using PostyBirb'); // probably a better way to detect this exists
    const description = (postData.description || '')
      .replace('Posted using PostyBirb', '')
      .substring(0, 2000)
      .trim();
    const files: File[] = [postData.primary, ...postData.additionalFiles]
      .filter(f => !!f)
      .map(f => new File([fileAsBlob(f)], `${options.spoiler ? 'SPOILER_' : ''}${f.fileInfo.name}`));

    try {
      for (let i = 0; i < webhooks.length; i++) {
        await this.postDescriptionToWebhook(webhooks[i], options.useTitle ? postData.title : undefined, description, options.embed, includesAd);
      }
      for (let i = 0; i < files.length; i++) {
        for (let j = 0; j < webhooks.length; j++) {
          await this.postFileToWebhook(webhooks[j], files[i], includesAd);
        }
      }
      return this.createPostResponse(null);
    } catch (e) {
      return Promise.reject(this.createPostResponse('Webhook failure', e instanceof HttpErrorResponse ? e.message : e));
    }
  }

  private async postDescriptionToWebhook(webhook: string, title: string, description: string, embedDescription: boolean, includeAd: boolean): Promise<any> {
    const json: any = {
      embeds: [{
        title
      }]
    };

    if (embedDescription || embedDescription === undefined) {
      json.embeds[0].description = description;
    } else {
      json.content = description;
    }

    if (includeAd) {
      json.embeds[0].footer = {
        text: 'Posted using PostyBirb'
      };
    }

    return this.createPost(webhook, json);
  }

  private async postFileToWebhook(webhook: string, file: File, includeAd: boolean): Promise<any> {
    const data: FormData = new FormData();
    data.set('file', file);

    if (includeAd) {
      const json = {
        // embeds: [{ footer: { text: 'Posted using PostyBirb' } }] disabled for now
      };
      data.set('payload_json', JSON.stringify(json));
    }

    return this.createPost(webhook, data);
  }

  private createPost(webhook: string, data: FormData): Promise<any> {
    return this.http.post(webhook, data, { responseType: 'json' }).toPromise();
  }
}
