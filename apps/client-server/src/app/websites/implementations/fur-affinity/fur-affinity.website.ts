import { SelectOption } from '@postybirb/form-builder';
import { Http } from '@postybirb/http';
import {
  FileType,
  ILoginState,
  ImageResizeProps,
  IPostResponse,
  PostData,
  PostResponse,
  SimpleValidationResult,
  SubmissionRating,
} from '@postybirb/types';
import cheerio from 'cheerio';
import { HTMLElement, parse } from 'node-html-parser';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import FileSize from '../../../utils/filesize.util';
import HtmlParserUtil from '../../../utils/html-parser.util';
import { PostBuilder } from '../../commons/post-builder';
import { UserLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { SupportsUsernameShortcut } from '../../decorators/supports-username-shortcut.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { MessageWebsite } from '../../models/website-modifiers/message-website';
import { Website } from '../../website';
import { FurAffinityAccountData } from './models/fur-affinity-account-data';
import { FurAffinityFileSubmission } from './models/fur-affinity-file-submission';
import { FurAffinityMessageSubmission } from './models/fur-affinity-message-submission';

@WebsiteMetadata({
  name: 'fur-affinity',
  displayName: 'Fur Affinity',
  minimumPostWaitInterval: 70_000,
})
@UserLoginFlow('https://furaffinity.net/login')
@SupportsUsernameShortcut({
  id: 'furaffinity',
  url: 'https://furaffinity.net/user/$1',
  convert: (websiteName, shortcut) => {
    if (websiteName === 'fur-affinity' && shortcut === 'furaffinity') {
      return ':icon$1:';
    }

    return undefined;
  },
})
@SupportsFiles({
  acceptedMimeTypes: [
    'image/jpg',
    'image/jpeg',
    'image/gif',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/swf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/rtf',
    'text/plain',
    'application/pdf',
    'application/vnd.oasis.opendocument.text',
    'audio/midi',
    'audio/wav',
    'audio/mp3',
    'audio/mpeg',
    'video/mpeg',
  ],
  acceptedFileSizes: {
    '*': FileSize.megabytes(10),
  },
})
export default class FurAffinity
  extends Website<FurAffinityAccountData>
  implements
    FileWebsite<FurAffinityFileSubmission>,
    MessageWebsite<FurAffinityMessageSubmission>
{
  protected BASE_URL = 'https://www.furaffinity.net';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<FurAffinityAccountData> =
    {
      folders: true,
    };

  public async onLogin(): Promise<ILoginState> {
    try {
      const res = await Http.get<string>(
        `${this.BASE_URL}/controls/submissions`,
        { partition: this.accountId },
      );

      if (res.body.includes('logout-link')) {
        const $ = parse(res.body);
        await this.getFolders($);
        return this.loginState.setLogin(
          true,
          $.querySelector('.loggedin_user_avatar').getAttribute('alt'),
        );
      }

      return this.loginState.setLogin(false, null);
    } catch (e) {
      this.logger.error('Failed to login', e);
      return this.loginState.setLogin(false, null);
    }
  }

  private getFolders($: HTMLElement) {
    const folders: SelectOption[] = [];
    const flatFolders: SelectOption[] = [];

    $.querySelector('select[name=assign_folder_id]').children.forEach((el) => {
      if (el.tagName === 'option') {
        if (el.getAttribute('value') === '0') {
          return;
        }
        const folder: SelectOption = {
          value: el.getAttribute('value'),
          label: el.textContent,
        };
        folders.push(folder);
        flatFolders.push(folder);
      } else {
        const optgroup: SelectOption = {
          group: el.getAttribute('label'),
          items: [],
        };
        [...el.children].forEach((opt) => {
          const f: SelectOption = {
            value: opt.getAttribute('value'),
            label: opt.textContent,
          };
          optgroup.items.push(f);
          flatFolders.push(f);
        });
        folders.push(optgroup);
      }
    });
  }

  createFileModel(): FurAffinityFileSubmission {
    return new FurAffinityFileSubmission();
  }

  calculateImageResize(): ImageResizeProps {
    return undefined;
  }

  private processForError(body: string): string | undefined {
    if (body.includes('redirect-message')) {
      const $ = cheerio.load(body);
      let msg = $('.redirect-message').first().text();

      if (msg?.includes('CAPTCHA')) {
        msg =
          'You need at least 11+ posts on your account before you can use PostyBirb with Fur Affinity.';
      }

      return msg;
    }

    return undefined;
  }

  async onPostFileSubmission(
    postData: PostData<FurAffinityFileSubmission>,
    files: PostingFile[],
    batchIndex: number,
    cancellationToken: CancellableToken,
  ): Promise<IPostResponse> {
    const part1 = await Http.get<string>(`${this.BASE_URL}/submit/`, {
      partition: this.accountId,
      headers: {
        Referer: 'https://www.furaffinity.net/submit/',
      },
    });

    PostResponse.validateBody(this, part1);
    const err = this.processForError(part1.body);
    if (err) {
      return PostResponse.fromWebsite(this)
        .withException(new Error(err))
        .withAdditionalInfo(part1.body);
    }

    const key = parse(part1.body)
      .querySelector('input[name="key"]')
      ?.getAttribute('value');
    if (!key) {
      return PostResponse.fromWebsite(this)
        .withException(new Error('Failed to retrieve key for file submission'))
        .withAdditionalInfo(part1.body);
    }

    // In theory, post-manager handles the alt file
    const part2 = await new PostBuilder(this, cancellationToken)
      .asMultipart()
      .setField('key', key)
      .setField('submission_type', this.getContentType(files[0].fileType))
      .addFile('submission', files[0])
      .addThumbnail('thumbnail', files[0])
      .withHeader('Referer', 'https://www.furaffinity.net/submit/')
      .send<string>(`${this.BASE_URL}/submit/upload`);

    const err2 = this.processForError(part2.body);
    if (err2) {
      return PostResponse.fromWebsite(this)
        .withException(new Error(err2))
        .withAdditionalInfo(part2.body);
    }

    const finalizeKey = parse(part2.body)
      .querySelector('#upload_form input[name="key"]')
      ?.getAttribute('value');

    if (!finalizeKey) {
      return PostResponse.fromWebsite(this)
        .withException(new Error('Failed to retrieve key for file submission'))
        .withAdditionalInfo(part2.body);
    }

    const builder = new PostBuilder(this, cancellationToken)
      .asUrlEncoded()
      .setField('key', finalizeKey)
      .setField('title', postData.options.title)
      .setField('message', postData.options.description)
      .setField('keywords', postData.options.tags.join(' '))
      .setField('rating', this.getRating(postData.options.rating))
      .setField('cat', postData.options.category)
      .setField('atype', postData.options.theme)
      .setField('species', postData.options.species)
      .setField('gender', postData.options.gender)
      .setConditional(
        'cat',
        files[0].fileType !== FileType.IMAGE,
        this.getContentCategory(files[0].fileType),
      )
      .setConditional('lock_comments', postData.options.disableComments, 'on')
      .setConditional('scrap', postData.options.scraps, '1')
      .setConditional(
        'folder_ids',
        postData.options.folders.length > 0,
        postData.options.folders,
      );

    const postResponse = await builder.send<string>(
      `${this.BASE_URL}/submit/finalize`,
    );

    if (!postResponse.responseUrl.includes('?upload-successful')) {
      const err3 = this.processForError(postResponse.body);
      if (err3) {
        return PostResponse.fromWebsite(this)
          .withException(new Error(err3))
          .withAdditionalInfo(postResponse.body);
      }

      return PostResponse.fromWebsite(this)
        .withException(new Error('Failed to post file submission'))
        .withAdditionalInfo(postResponse.body);
    }

    return PostResponse.fromWebsite(this)
      .withSourceUrl(postResponse.responseUrl.replace('?upload-successful', ''))
      .withMessage('File posted successfully')
      .withAdditionalInfo(postResponse.body);
  }

  async onValidateFileSubmission(
    postData: PostData<FurAffinityFileSubmission>,
  ): Promise<SimpleValidationResult> {
    const validator = this.createValidator<FurAffinityFileSubmission>();

    return validator.result;
  }

  createMessageModel(): FurAffinityMessageSubmission {
    return new FurAffinityMessageSubmission();
  }

  async onPostMessageSubmission(
    postData: PostData<FurAffinityMessageSubmission>,
    cancellationToken: CancellableToken,
  ): Promise<IPostResponse> {
    const page = await Http.get<string>(`${this.BASE_URL}/controls/journal`, {
      partition: this.accountId,
    });
    PostResponse.validateBody(this, page);

    const key = parse(page.body)
      .querySelector('#journal-form input[name="key"]')
      ?.getAttribute('value');
    if (!key) {
      return PostResponse.fromWebsite(this)
        .withException(
          new Error('Failed to retrieve key for journal submission'),
        )
        .withAdditionalInfo(page.body);
    }
    const key2 = HtmlParserUtil.getInputValue(
      page.body.split('action="/controls/journal/"').pop(),
      'key',
    );
    const builder = new PostBuilder(this, cancellationToken)
      .asUrlEncoded()
      .setField('key', key)
      .setField('message', postData.options.description)
      .setField('subject', postData.options.title)
      .setField('id', '0')
      .setField('do', 'update')
      .setConditional('make_featured', postData.options.feature, 'on');

    const post = await builder.send<string>(
      `${this.BASE_URL}/controls/journal/`,
    );

    if (post.body.includes('journal-title')) {
      return PostResponse.fromWebsite(this)
        .withAdditionalInfo(post.body)
        .withSourceUrl(post.responseUrl);
    }

    return PostResponse.fromWebsite(this)
      .withException(new Error('Failed to post journal'))
      .withAdditionalInfo(post.body);
  }

  private getContentType(type: FileType) {
    switch (type) {
      case FileType.TEXT:
        return 'story';
      case FileType.VIDEO:
        return 'flash';
      case FileType.AUDIO:
        return 'music';
      case FileType.IMAGE:
      default:
        return 'submission';
    }
  }

  private getContentCategory(type: FileType) {
    switch (type) {
      case FileType.TEXT:
        return '13';
      case FileType.VIDEO:
        return '7';
      case FileType.AUDIO:
        return '16';
      case FileType.IMAGE:
      default:
        return '1';
    }
  }

  private getRating(rating: SubmissionRating) {
    switch (rating) {
      case SubmissionRating.ADULT:
      case SubmissionRating.EXTREME:
        return '1';
      case SubmissionRating.MATURE:
        return '2';
      case SubmissionRating.GENERAL:
      default:
        return '0';
    }
  }

  async onValidateMessageSubmission(
    postData: PostData<FurAffinityMessageSubmission>,
  ): Promise<SimpleValidationResult> {
    const validator = this.createValidator<FurAffinityMessageSubmission>();

    return validator.result;
  }
}
