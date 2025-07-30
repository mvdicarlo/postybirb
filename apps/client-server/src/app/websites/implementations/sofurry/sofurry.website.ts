import { Http } from '@postybirb/http';
import {
  FileType,
  ILoginState,
  ImageResizeProps,
  IPostResponse,
  ISubmissionFile,
  PostData,
  PostResponse,
  SimpleValidationResult,
  SubmissionRating,
} from '@postybirb/types';
import { HTMLElement, parse } from 'node-html-parser';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import HtmlParserUtil from '../../../utils/html-parser.util';
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
import { SofurryAccountData } from './models/sofurry-account-data';
import { SofurryFileSubmission } from './models/sofurry-file-submission';
import { SofurryMessageSubmission } from './models/sofurry-message-submission';

@WebsiteMetadata({
  name: 'sofurry',
  displayName: 'SoFurry',
})
@UserLoginFlow('https://www.sofurry.com/user/login')
@SupportsUsernameShortcut({
  id: 'sofurry',
  url: 'https://$1.sofurry.com/',
})
@SupportsFiles({
  acceptedMimeTypes: [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'application/x-shockwave-flash',
    'text/plain',
    'audio/mp3',
    'audio/mpeg',
    'video/mp4',
  ],
  acceptedFileSizes: {
    '*': FileSize.megabytes(50),
  },
})
export default class Sofurry
  extends Website<SofurryAccountData>
  implements
    FileWebsite<SofurryFileSubmission>,
    MessageWebsite<SofurryMessageSubmission>
{
  protected BASE_URL = 'https://www.sofurry.com';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<SofurryAccountData> =
    {
      folders: true,
    };

  public async onLogin(): Promise<ILoginState> {
    try {
      const res = await Http.get<string>(
        `${this.BASE_URL}/upload/details?contentType=1`,
        {
          partition: this.accountId,
        },
      );

      if (res.body.includes('Logout')) {
        const $ = parse(res.body);
        const username = $.querySelector('a.avatar')
          ?.getAttribute('href')
          ?.split('.')[0]
          ?.split('/')
          .pop();

        this.getFolders($);
        return this.loginState.setLogin(true, username || 'Unknown');
      }

      return this.loginState.setLogin(false, null);
    } catch (e) {
      return this.loginState.setLogin(false, null);
    }
  }

  private getFolders($: HTMLElement) {
    const folders = [];
    const folderSelect = $.querySelector('#UploadForm_folderId');
    if (folderSelect) {
      folderSelect.querySelectorAll('option').forEach((option) => {
        const value = option.getAttribute('value');
        const label = option.innerText;
        if (value && label) {
          folders.push({ value, label });
        }
      });
    }

    this.setWebsiteData({
      folders,
    });
  }

  createFileModel(): SofurryFileSubmission {
    return new SofurryFileSubmission();
  }

  calculateImageResize(): ImageResizeProps {
    return undefined;
  }

  private getSubmissionType(type: FileType): string {
    switch (type) {
      case FileType.AUDIO:
        return '2';
      case FileType.TEXT:
        return '0';
      case FileType.IMAGE:
      case FileType.VIDEO:
      default:
        return '1';
    }
  }

  private getRating(rating: SubmissionRating): string {
    switch (rating) {
      case SubmissionRating.EXTREME:
        return '2';
      case SubmissionRating.ADULT:
      case SubmissionRating.MATURE:
        return '1';
      case SubmissionRating.GENERAL:
      default:
        return '0';
    }
  }

  async onPostFileSubmission(
    postData: PostData<SofurryFileSubmission>,
    files: PostingFile[],
    batchIndex: number,
    cancellationToken: CancellableToken,
  ): Promise<IPostResponse> {
    const url = `${this.BASE_URL}/upload/details?contentType=${this.getSubmissionType(
      files[0].fileType,
    )}`;

    const page = await Http.get<string>(url, {
      partition: this.accountId,
    });

    PostResponse.validateBody(this, page);

    const csrfToken = parse(page.body)
      .querySelector('input[name="YII_CSRF_TOKEN"]')
      ?.getAttribute('value');
    if (!csrfToken) {
      throw new Error('Failed to find CSRF token');
    }

    // Parse description to remove newlines after closing div tags
    const processedDescription = this.parseDescription(
      postData.options.description,
    );

    const builder = new PostBuilder(this, cancellationToken)
      .asMultipart()
      .setField('YII_CSRF_TOKEN', csrfToken)
      .setField('UploadForm[P_title]', postData.options.title)
      .setField('UploadForm[description]', processedDescription)
      .setField('UploadForm[formtags]', postData.options.tags.join(', '))
      .setField(
        'UploadForm[contentLevel]',
        this.getRating(postData.options.rating),
      )
      .setField('UploadForm[P_hidePublic]', '0')
      .setField('UploadForm[folderId]', postData.options.folder || '0');

    if (files[0].fileType === FileType.TEXT) {
      builder.setField('UploadForm[textcontent]', files[0].buffer.toString());
      if (postData.options.thumbnailAsCoverArt && files[0].thumbnail) {
        builder.addThumbnail('UploadForm[binarycontent_5]', files[0]);
      }
    } else {
      builder.addFile('UploadForm[binarycontent]', files[0]);
      builder.addThumbnail('UploadForm[binarycontent_5]', files[0]);
    }

    const postResponse = await builder
      .withHeader('referer', url)
      .send<string>(url);

    if (postResponse.body.includes('edit')) {
      return PostResponse.fromWebsite(this)
        .withSourceUrl(postResponse.responseUrl)
        .withMessage('File posted successfully')
        .withAdditionalInfo(postResponse.body);
    }

    throw new Error(`Failed to post file: ${postResponse.body}`);
  }

  onValidateFileSubmission = validatorPassthru;

  createMessageModel(): SofurryMessageSubmission {
    return new SofurryMessageSubmission();
  }

  async onPostMessageSubmission(
    postData: PostData<SofurryMessageSubmission>,
    cancellationToken: CancellableToken,
  ): Promise<IPostResponse> {
    const url = `${this.BASE_URL}/upload/details?contentType=3`;

    const page = await Http.get<string>(url, {
      partition: this.accountId,
    });

    PostResponse.validateBody(this, page);

    const csrfToken = parse(page.body)
      .querySelector('input[name="YII_CSRF_TOKEN"]')
      ?.getAttribute('value');
    const uploadFormId = parse(page.body)
      .querySelector('input[name="UploadForm[P_id]"]')
      ?.getAttribute('value');

    if (!csrfToken) {
      throw new Error('Failed to find CSRF token');
    }

    // Use first line of description as the summary
    const description = this.parseDescription(postData.options.description);
    const descriptionLines = description.split('\n');
    const summary = descriptionLines.length > 0 ? descriptionLines[0] : '';

    const builder = new PostBuilder(this, cancellationToken)
      .asMultipart()
      .setField('YII_CSRF_TOKEN', csrfToken)
      .setField('UploadForm[P_id]', uploadFormId || '')
      .setField('UploadForm[P_title]', postData.options.title)
      .setField('UploadForm[textcontent]', description)
      .setField('UploadForm[description]', summary)
      .setField('UploadForm[formtags]', postData.options.tags.join(', '))
      .setField(
        'UploadForm[contentLevel]',
        this.getRating(postData.options.rating),
      )
      .setField('UploadForm[P_hidePublic]', '0')
      .setField('UploadForm[folderId]', postData.options.folder || '0')
      .setField('UploadForm[newFolderName]', '')
      .setField('UploadForm[P_isHTML]', '1')
      .setField('save', 'Publish');

    const postResponse = await builder
      .withHeader('referer', url)
      .send<string>(url);

    if (postResponse.body.includes('edit')) {
      return PostResponse.fromWebsite(this)
        .withSourceUrl(postResponse.responseUrl)
        .withMessage('Message posted successfully')
        .withAdditionalInfo(postResponse.body);
    }

    throw new Error(`Failed to post message: ${postResponse.body}`);
  }

  onValidateMessageSubmission = validatorPassthru;

  private parseDescription(text: string): string {
    return text.replace(/<\/div>(\n|\r)/g, '</div>').replace(/\n/g, '');
  }
}
