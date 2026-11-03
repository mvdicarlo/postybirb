import { SelectOption } from '@postybirb/form-builder';
import { FormFile, HttpResponse } from '@postybirb/http/types';

import {
  FileType,
  ImageResizeProps,
  LoginResult,
  PostData,
  PostResponse,
  SubmissionRating,
} from '@postybirb/types';
import { getFileTypeFromMimeType } from '@postybirb/utils/file-type';
import { parse } from 'node-html-parser';
import request from 'request';
import { CancellationToken } from '../../../posting/cancellation-token';
import { PostingFile } from '../../../posting/models/posting-file';
import FileSize from '../../../utils/filesize.util';
import { PostBuilder } from '../../commons/post-builder';
import { validatorPassthru } from '../../commons/validator-passthru';
import { UserLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { SupportsUsernameShortcut } from '../../decorators/supports-username-shortcut.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { MessageWebsite } from '../../models/website-modifiers/message-website';
import { Website } from '../../website';
import { WeasylAccountData } from './models/weasyl-account-data';
import { WeasylFileSubmission } from './models/weasyl-file-submission';
import { WeasylMessageSubmission } from './models/weasyl-message-submission';

@WebsiteMetadata({
  name: 'weasyl',
  displayName: 'Weasyl',
})
@UserLoginFlow('https://weasyl.com')
@SupportsFiles({
  acceptedMimeTypes: [
    'application/pdf',
    'audio/mp3',
    'image/gif',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'swf',
    'text/markdown',
    'text/plain',
    'text/pdf',
  ],
  acceptedFileSizes: {
    [FileType.IMAGE]: FileSize.megabytes(50),
    'application/pdf': FileSize.megabytes(10),
    'text/*': FileSize.megabytes(2),
    swf: FileSize.megabytes(50),
    'audio/mp3': FileSize.megabytes(15),
  },
})
@SupportsUsernameShortcut({
  id: 'weasyl',
  url: 'https://weasyl.com/~$1',
  convert: (websiteName, shortcut) => {
    if (websiteName === 'weasyl' && shortcut === 'weasyl') {
      return '<!~$1>';
    }
    return undefined;
  },
})
export default class Weasyl
  extends Website<WeasylAccountData>
  implements
    FileWebsite<WeasylFileSubmission>,
    MessageWebsite<WeasylMessageSubmission>
{
  protected BASE_URL = 'https://www.weasyl.com';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<WeasylAccountData> =
    {
      folders: true,
    };

  public async onLogin(): Promise<LoginResult> {
    const res = await this.platform.http.get<{ login: string }>(
      `${this.BASE_URL}/api/whoami`,
      {
        partition: this.accountId,
      },
    );

    if (res.body.login) {
      await this.getFolders(res.body.login);
      return { loggedIn: true, username: res.body.login };
    }

    return { loggedIn: false };
  }

  private async getFolders(username: string): Promise<void> {
    const res = await this.platform.http.get<{
      folders: {
        title: string;
        folder_id: string;
        subfolders: {
          title: string;
          folder_id: string;
        }[];
      }[];
    }>(`${this.BASE_URL}/api/users/${username}/view`, {
      partition: this.accountId,
    });

    const weasylFolders = res.body.folders ?? [];
    const folders: SelectOption[] = [];
    weasylFolders.forEach((f) => {
      const folder: SelectOption = {
        label: f.title,
        value: f.folder_id,
      };

      folders.push(folder);

      if (f.subfolders) {
        f.subfolders.forEach((sf) => {
          const subfolder: SelectOption = {
            label: `${folder.label} / ${sf.title}`,
            value: sf.folder_id,
          };

          folders.push(subfolder);
        });
      }
    });

    this.websiteDataStore.setData({
      ...this.websiteDataStore.getData(),
      folders,
    });
  }

  createFileModel(): WeasylFileSubmission {
    return new WeasylFileSubmission();
  }

  calculateImageResize(): ImageResizeProps | undefined {
    return undefined;
  }

  private modifyDescription(html: string) {
    return html
      .replace(/<p/gm, '<div')
      .replace(/<\/p>/gm, '</div>')
      .replace(/style="text-align: center"/g, 'class="align-center"')
      .replace(/style="text-align: right"/g, 'class="align-right"')
      .replace(/<\/div>\n<br>/g, '</div><br>')
      .replace(/<\/div><br>/g, '</div><div><br></div>');
  }

  private convertRating(rating: SubmissionRating) {
    switch (rating) {
      case SubmissionRating.MATURE:
        return 30;
      case SubmissionRating.ADULT:
      case SubmissionRating.EXTREME:
        return 40;
      case SubmissionRating.GENERAL:
      default:
        return 10;
    }
  }

  private getContentType(type: FileType) {
    switch (type) {
      case FileType.TEXT:
        return 'literary';
      case FileType.AUDIO:
      case FileType.VIDEO:
        return 'multimedia';
      case FileType.IMAGE:
      default:
        return 'visual';
    }
  }

  /*
   * For whatever reason Weasyl does not play well with our electron HTTP client.
   * This method uses the request library instead which mimic what is already working
   * in PostyBirb-Plus.
   */
  private async sendWeasylRequest(
    url: string,
    cookieHeader: string,
    cancellationToken: CancellationToken,
    builder?: PostBuilder,
  ): Promise<HttpResponse<string>> {
    cancellationToken.throwIfAborted();
    const formData = builder
      ? Object.fromEntries(
          Object.entries(builder.build()).map(([key, value]) => [
            key,
            value instanceof FormFile
              ? { value: value.buffer, options: value.fileOptions }
              : value,
          ]),
        )
      : undefined;

    const result = await new Promise<HttpResponse<string>>(
      (resolve, reject) => {
        const onAbort = () => {
          reject(cancellationToken.signal.reason);
          pendingRequest.abort();
        };
        const pendingRequest = request(
          {
            url,
            method: builder ? 'POST' : 'GET',
            jar: false,
            formData,
            headers: {
              Referer: url,
              Origin: this.BASE_URL,
              Cookie: cookieHeader,
              Host: 'www.weasyl.com',
            },
            followAllRedirects: true,
            followRedirect: (response) =>
              new URL(response.headers.location ?? url, url).origin ===
              this.BASE_URL,
            gzip: true,
            timeout: 300_000,
          },
          (error, response, body: string) => {
            cancellationToken.signal.removeEventListener('abort', onAbort);
            if (error) {
              reject(error);
              return;
            }
            resolve({
              body,
              statusCode: response.statusCode ?? 0,
              statusMessage: response.statusMessage ?? '',
              responseUrl: response.request.uri.href ?? url,
            });
          },
        );
        cancellationToken.signal.addEventListener('abort', onAbort, {
          once: true,
        });
        if (cancellationToken.aborted) onAbort();
      },
    );

    cancellationToken.throwIfAborted();
    PostResponse.validateBody(this, result);
    return result;
  }

  async onPostFileSubmission(
    postData: PostData<WeasylFileSubmission>,
    files: PostingFile[],
    cancellationToken: CancellationToken,
  ): Promise<PostResponse> {
    cancellationToken.throwIfAborted();
    const fileType = getFileTypeFromMimeType(files[0].mimeType);
    const contentType = this.getContentType(fileType);
    const url = `${this.BASE_URL}/submit/${contentType}`;
    const cookies = await this.platform.http.getWebsiteCookies(
      this.accountId,
      url,
    );
    const cookieHeader = cookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join('; ');

    const {
      description,
      title,
      rating,
      tags,
      notify,
      critique,
      folder,
      category,
    } = postData.options;

    const builder = new PostBuilder(this, cancellationToken)
      .asMultipart()
      .setField('title', title)
      .setField('rating', this.convertRating(rating))
      .setField('content', this.modifyDescription(description))
      .setField('tags', tags.join(' '))
      .addFile('submitfile', files[0])
      .setConditional('nonotification', !notify, 'on')
      .setConditional('critique', critique, 'on')
      .setField('folderid', folder || '')
      .setField('subtype', category || '')
      .addThumbnail('thumbfile', files[0]);

    // For text, video, and audio files, add cover file
    if (
      fileType === FileType.TEXT ||
      fileType === FileType.VIDEO ||
      fileType === FileType.AUDIO
    ) {
      builder.addThumbnail('coverfile', files[0]);
    }

    let result = await this.sendWeasylRequest(
      url,
      cookieHeader,
      cancellationToken,
      builder,
    );

    if (result.body.includes('manage_thumbnail')) {
      const html = parse(result.body);
      const submitId = html.querySelector('input[name="submitid"]');
      if (!submitId) {
        throw new Error('Failed to find submitid');
      }
      const thumbnailBuilder = new PostBuilder(this, cancellationToken)
        .asMultipart()
        .setField('x1', '0')
        .setField('x2', '0')
        .setField('y1', '0')
        .setField('y2', '0')
        .setField('thumbfile', '')
        .setField('submitid', submitId.getAttribute('value') || '');

      result = await this.sendWeasylRequest(
        `${this.BASE_URL}/manage/thumbnail`,
        cookieHeader,
        cancellationToken,
        thumbnailBuilder,
      );
    }

    const { body } = result;
    if (
      body.includes(
        'You have already made a submission with this submission file',
      )
    ) {
      return PostResponse.fromWebsite(this).withMessage(
        'You have already made a submission with this submission file',
      );
    }

    if (
      body.includes('Submission Information') ||
      // Currently unknown issue with Weasyl where they return a security error page instead of the submission page
      // However usually the post is made successfully, so we will treat this as a success and return the source URL
      body.includes(
        'We weren’t able to process your request for security reasons',
      ) ||
      // If they set a rating of adult and didn't set nsfw when they logged in
      body.includes(
        'This page contains content that you cannot view according to your current allowed ratings',
      )
    ) {
      // Standard return
      return PostResponse.fromWebsite(this).withSourceUrl(result.responseUrl);
    }

    if (body.includes('Weasyl experienced a technical issue')) {
      // Unknown issue so do a second check
      const recheck = await this.sendWeasylRequest(
        result.responseUrl,
        cookieHeader,
        cancellationToken,
      );
      if (recheck.body.includes('Submission Information')) {
        return PostResponse.fromWebsite(this).withSourceUrl(
          recheck.responseUrl,
        );
      }
    }

    return PostResponse.fromWebsite(this)
      .withAdditionalInfo({
        body: result.body,
        statusCode: result.statusCode,
      })
      .withException(
        new Error(`Unknown response from Weasyl at ${result.responseUrl}`),
      );
  }

  onValidateFileSubmission = validatorPassthru;

  createMessageModel(): WeasylMessageSubmission {
    return new WeasylMessageSubmission();
  }

  async onPostMessageSubmission(
    postData: PostData<WeasylMessageSubmission>,
    cancellationToken: CancellationToken,
  ): Promise<PostResponse> {
    cancellationToken.throwIfAborted();
    const url = `${this.BASE_URL}/submit/journal`;
    const cookies = await this.platform.http.getWebsiteCookies(
      this.accountId,
      url,
    );
    const cookieHeader = cookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join('; ');
    await this.sendWeasylRequest(url, cookieHeader, cancellationToken);

    const { description, title, rating, tags } = postData.options;

    const builder = new PostBuilder(this, cancellationToken)
      .asMultipart()
      .setField('title', title)
      .setField('rating', this.convertRating(rating))
      .setField('content', this.modifyDescription(description))
      .setField('tags', tags.join(' '));

    const result = await this.sendWeasylRequest(
      url,
      cookieHeader,
      cancellationToken,
      builder,
    );

    return PostResponse.fromWebsite(this).withAdditionalInfo({
      body: result,
    });
  }

  onValidateMessageSubmission = validatorPassthru;
}
