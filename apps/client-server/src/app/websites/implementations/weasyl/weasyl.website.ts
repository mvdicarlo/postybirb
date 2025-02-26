import { SelectOption } from '@postybirb/form-builder';
import { Http } from '@postybirb/http';
import {
  DynamicObject,
  FileType,
  ILoginState,
  ImageResizeProps,
  PostData,
  PostResponse,
  SubmissionRating,
} from '@postybirb/types';
import { getFileTypeFromMimeType } from '@postybirb/utils/file-type';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import FileSize from '../../../utils/filesize.util';
import HtmlParserUtil from '../../../utils/html-parser.util';
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
    [FileType.IMAGE]: FileSize.mbToBytes(50),
    'application/pdf': FileSize.mbToBytes(10),
    'text/*': FileSize.mbToBytes(2),
    swf: FileSize.mbToBytes(50),
    'audio/mp3': FileSize.mbToBytes(15),
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

  public async onLogin(): Promise<ILoginState> {
    const res = await Http.get<{ login: string }>(
      `${this.BASE_URL}/api/whoami`,
      {
        partition: this.accountId,
      },
    );

    if (res.body.login) {
      this.loginState.setLogin(true, res.body.login);
      await this.getFolders(res.body.login);
    } else {
      this.loginState.setLogin(false, null);
    }

    return this.loginState.getState();
  }

  private async getFolders(username: string): Promise<void> {
    const res = await Http.get<{
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

  calculateImageResize(): ImageResizeProps {
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

  async onPostFileSubmission(
    postData: PostData<WeasylFileSubmission>,
    files: PostingFile[],
    batchIndex: number,
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    cancellationToken.throwIfCancelled();
    const fileType = getFileTypeFromMimeType(files[0].mimeType);
    const contentType = this.getContentType(fileType);
    const url = `${this.BASE_URL}/submit/${contentType}`;

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
    const formData: DynamicObject = {
      title,
      rating: this.convertRating(rating),
      content: this.modifyDescription(description),
      tags: tags.join(' '),
      submitfile: files[0].toPostFormat(),
      thumbfile: files[0].thumbnailToPostFormat(),
      nonotification: notify ? undefined : 'on',
      critique: critique ? 'on ' : undefined,
      folderid: folder || '',
      subtype: category || '',
    };

    if (
      fileType === FileType.TEXT ||
      fileType === FileType.VIDEO ||
      fileType === FileType.AUDIO
    ) {
      formData.coverfile = formData.thumbfile ? formData.thumbfile : '';
    }

    cancellationToken.throwIfCancelled();
    let result = await Http.post<string>(url, {
      partition: this.accountId,
      data: formData,
      type: 'multipart',
      headers: {
        Referer: url,
        Origin: 'https://www.weasyl.com',
      },
    });

    if (result.body.includes('manage_thumbnail')) {
      result = await Http.post<string>(`${this.BASE_URL}/manage/thumbnail`, {
        partition: this.accountId,
        type: 'multipart',
        data: {
          x1: '0',
          x2: '0',
          y1: '0',
          y2: '0',
          thumbfile: '',
          submitid: HtmlParserUtil.getInputValue(result.body, 'submitid'),
        },
        headers: {
          Referer: url,
          Origin: 'https://www.weasyl.com',
          // Host: 'www.weasyl.com',
        },
      });
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
      const recheck = await Http.get<string>(result.responseUrl, {
        partition: this.accountId,
      });
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
      .withException(new Error('Unknown response from Weasyl'));
  }

  onValidateFileSubmission = validatorPassthru;

  createMessageModel(): WeasylMessageSubmission {
    return new WeasylMessageSubmission();
  }

  async onPostMessageSubmission(
    postData: PostData<WeasylMessageSubmission>,
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    cancellationToken.throwIfCancelled();
    const url = `${this.BASE_URL}/submit/journal`;
    const submissionPage = await Http.get<string>(url, {
      partition: this.accountId,
    });
    PostResponse.validateBody(this, submissionPage);
    const { description, title, rating, tags } = postData.options;
    const formData = {
      title,
      rating: this.convertRating(rating),
      content: this.modifyDescription(description),
      tags: tags.join(' '),
    };

    cancellationToken.throwIfCancelled();
    const result = await Http.post<string>(`${this.BASE_URL}/submit`, {
      partition: this.accountId,
      data: formData,
      type: 'multipart',
      headers: {
        Referer: url,
        Origin: 'https://www.weasyl.com',
        Host: 'www.weasyl.com',
      },
    });

    PostResponse.validateBody(this, result);

    return PostResponse.fromWebsite(this).withAdditionalInfo({
      body: result.body,
      statusCode: result.statusCode,
    });
  }

  onValidateMessageSubmission = validatorPassthru;
}
