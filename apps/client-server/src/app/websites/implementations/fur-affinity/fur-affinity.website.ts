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
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import FileSize from '../../../utils/filesize.util';
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
  protected BASE_URL = 'https://furaffinity.net';

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
        const $ = cheerio.load(res.body);
        await this.getFolders($);
        return this.loginState.setLogin(
          true,
          $('.loggedin_user_avatar').attr('alt'),
        );
      }

      return this.loginState.setLogin(false, null);
    } catch (e) {
      this.logger.error('Failed to login', e);
      return this.loginState.setLogin(false, null);
    }
  }

  private getFolders($: cheerio.CheerioAPI) {
    const folders: SelectOption[] = [];
    const flatFolders: SelectOption[] = [];

    $('select[name=assign_folder_id]')
      .children()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .each((i, el: any) => {
        const $el = $(el);
        if (el.name === 'option') {
          if ($el.attr('value') === '0') {
            return;
          }
          const folder: SelectOption = {
            value: $el.attr('value'),
            label: $el.text(),
          };
          folders.push(folder);
          flatFolders.push(folder);
        } else {
          const optgroup: SelectOption = {
            group: $el.attr('label'),
            items: [],
          };
          $el.children().each((_, opt) => {
            const $opt = $(opt);
            const f: SelectOption = {
              value: $opt.attr('value'),
              label: $opt.text(),
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

  onPostFileSubmission(
    postData: PostData<FurAffinityFileSubmission>,
    files: PostingFile[],
    batchIndex: number,
    cancellationToken: CancellableToken,
  ): Promise<IPostResponse> {
    throw new Error('Method not implemented.');
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
