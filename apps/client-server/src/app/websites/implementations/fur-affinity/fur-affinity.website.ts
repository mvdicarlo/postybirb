import { SelectOption } from '@postybirb/form-builder';

import {
  FileType,
  ImageResizeProps,
  IPostResponse,
  LoginResult,
  PostData,
  PostResponse,
  SimpleValidationResult,
  SubmissionRating,
} from '@postybirb/types';
import { HTMLElement, parse } from 'node-html-parser';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import FileSize from '../../../utils/filesize.util';
import { PostBuilder } from '../../commons/post-builder';
import { SubmissionValidator } from '../../commons/validator';
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

  protected readonly cookieIgnoreList = ['FCNEC'];

  public async onLogin(): Promise<LoginResult> {
    try {
      const res = await this.platform.http.get<string>(
        `${this.BASE_URL}/controls/submissions`,
        { partition: this.accountId },
      );

      if (res.body.includes('logout-link')) {
        const $ = parse(res.body);
        await this.getFolders($);
        const username = $.querySelector('.loggedin_user_avatar')?.getAttribute(
          'alt',
        );
        if (!username) {
          this.logger.warn(
            'Failed to find loggedin_user_avatar element during login',
          );
        }
        return { loggedIn: true, username: username ?? null };
      }

      return { loggedIn: false };
    } catch (e) {
      this.logger.withError(e).error('Failed to login');
      return { loggedIn: false };
    }
  }

  private async getFolders($: HTMLElement) {
    const folderSelect = $.querySelector('select[name=assign_folder_id]');
    if (!folderSelect) {
      this.logger.warn('Failed to find folder select element during login');
      return;
    }

    await this.setWebsiteData({
      folders: this.getFolderOptions(folderSelect.children),
    });
  }

  private getFolderOptions(elements: HTMLElement[]): SelectOption[] {
    return elements.reduce<SelectOption[]>((options, el) => {
      const option = this.getFolderOption(el);
      if (option) {
        options.push(option);
      }
      return options;
    }, []);
  }

  private getFolderOption(el: HTMLElement): SelectOption | undefined {
    if (el.tagName === 'OPTION') {
      const value = el.getAttribute('value') || '';
      if (value === '0') {
        return undefined;
      }

      return {
        value,
        label: el.textContent.trim() || 'Unknown',
      };
    }

    if (el.tagName === 'OPTGROUP') {
      const items = this.getFolderOptions(el.children);
      if (!items.length) {
        return undefined;
      }

      return {
        label: el.getAttribute('label')?.trim() || 'Unknown',
        items,
      };
    }

    return undefined;
  }

  createFileModel(): FurAffinityFileSubmission {
    return new FurAffinityFileSubmission();
  }

  calculateImageResize(): ImageResizeProps | undefined {
    return undefined;
  }

  private processForError(body: string): string | undefined {
    if (body.includes('redirect-message')) {
      const $ = parse(body);
      let msg = $.querySelector('.redirect-message')?.textContent?.trim();

      if (msg?.includes('CAPTCHA')) {
        msg =
          'You need at least 11+ posts on your account before you can use PostyBirb with Fur Affinity.';
      }

      return msg;
    }

    return undefined;
  }

  private lastPostTime = 0;

  private async waitForFloodProtection(
    cancellationToken: CancellableToken,
  ): Promise<void> {
    const elapsed = Date.now() - this.lastPostTime;
    const floodCooldown = 15 * 1000;

    if (elapsed < floodCooldown) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, floodCooldown - elapsed + 1000);
      });
      cancellationToken.throwIfCancelled();

      // Ensure that concurent calls have flood protection too
      // (e.g. schedule & manual post at the same time)
      return this.waitForFloodProtection(cancellationToken);
    }

    this.lastPostTime = Date.now();
    return Promise.resolve();
  }

  async onPostFileSubmission(
    postData: PostData<FurAffinityFileSubmission>,
    files: PostingFile[],
    cancellationToken: CancellableToken,
  ): Promise<IPostResponse> {
    await this.waitForFloodProtection(cancellationToken);

    const part1 = await this.platform.http.get<string>(
      `${this.BASE_URL}/submit/`,
      {
        partition: this.accountId,
        headers: {
          Referer: 'https://www.furaffinity.net/submit/',
        },
      },
    );

    PostResponse.validateBody(this, part1);
    const err = this.processForError(part1.body);
    if (err) {
      return PostResponse.fromWebsite(this)
        .withException(new Error(err))
        .withAdditionalInfo(part1.body);
    }

    const key =
      parse(part1.body)
        .querySelector('#upload_form input[name="key"]')
        ?.getAttribute('value') ??
      parse(part1.body)
        .querySelector('#myform input[name="key"]')
        ?.getAttribute('value');
    if (!key) {
      return PostResponse.fromWebsite(this)
        .withException(new Error('Failed to retrieve key for file submission'))
        .withAdditionalInfo(part1.body)
        .atStage('part 1');
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
        .withAdditionalInfo(part2.body)
        .atStage('part 2');
    }

    const finalizeKey = parse(part2.body)
      .querySelector('#myform input[name="key"]')
      ?.getAttribute('value');

    if (!finalizeKey) {
      return PostResponse.fromWebsite(this)
        .withException(new Error('Failed to retrieve key for file submission'))
        .withAdditionalInfo(part2.body)
        .atStage('finalize key get');
    }

    const builder = new PostBuilder(this, cancellationToken)
      .asUrlEncoded()
      .setField('key', finalizeKey)
      .setField('title', postData.options.title)
      .setField('message', postData.options.description)
      .setField('keywords', postData.options.tags.join(' '))
      .setField('rating', this.getRating(postData.options.rating))
      .setField('atype', postData.options.theme || '1')
      .setField('species', postData.options.species)
      .setField('gender', postData.options.gender)
      .setConditional(
        'cat',
        files[0].fileType === FileType.IMAGE,
        postData.options.category,
        this.getContentCategory(files[0].fileType),
      )
      .setConditional('lock_comments', postData.options.disableComments, 'on')
      .setConditional('scrap', postData.options.scraps, '1')
      .setConditional(
        'folder_ids',
        (postData.options.folders ?? []).length > 0,
        postData.options.folders,
      );

    const postResponse = await builder.send<string>(
      `${this.BASE_URL}/submit/finalize`,
    );

    if (!postResponse?.responseUrl?.includes('?upload-successful')) {
      const err3 = this.processForError(postResponse.body);
      if (err3) {
        return PostResponse.fromWebsite(this)
          .withMessage(err3)
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

    this.validateKeywords(postData, validator);

    return validator.result;
  }

  private validateKeywords(
    postData: PostData<
      FurAffinityFileSubmission | FurAffinityMessageSubmission
    >,
    validator:
      | SubmissionValidator<FurAffinityFileSubmission>
      | SubmissionValidator<FurAffinityMessageSubmission>,
  ) {
    const keywords = postData.options.tags.join(' ');
    const keywordsFieldLimit = 500;

    if (keywords.length >= keywordsFieldLimit) {
      validator.error(
        'validation.tags.furaffinity.keywords-max-length',
        {
          currentLength: keywords.length,
          maxLength: keywordsFieldLimit,
        },
        'tags',
      );
    }
  }

  createMessageModel(): FurAffinityMessageSubmission {
    return new FurAffinityMessageSubmission();
  }

  async onPostMessageSubmission(
    postData: PostData<FurAffinityMessageSubmission>,
    cancellationToken: CancellableToken,
  ): Promise<IPostResponse> {
    const page = await this.platform.http.get<string>(
      `${this.BASE_URL}/controls/journal`,
      {
        partition: this.accountId,
      },
    );
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

    if (
      /^https:\/\/www\.furaffinity\.net\/journal\/\d+\/$/.test(post.responseUrl)
    ) {
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

    this.validateKeywords(postData, validator);

    return validator.result;
  }
}
