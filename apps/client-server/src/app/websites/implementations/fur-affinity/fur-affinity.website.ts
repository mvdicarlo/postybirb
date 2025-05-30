import { Http } from '@postybirb/http';
import {
  ILoginState,
  ImageResizeProps,
  IPostResponse,
  PostData,
  SimpleValidationResult,
} from '@postybirb/types';
import { load } from 'cheerio';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import { UserLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { SupportsUsernameShortcut } from '../../decorators/supports-username-shortcut.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { MessageWebsite } from '../../models/website-modifiers/message-website';
import { WithCustomDescriptionParser } from '../../models/website-modifiers/with-custom-description-parser';
import { Website } from '../../website';
import { FurAffinityAccountData } from './models/fur-affinity-account-data';
import { FurAffinityFileSubmission } from './models/fur-affinity-file-submission';
import { FurAffinityMessageSubmission } from './models/fur-affinity-message-submission';

@WebsiteMetadata({
  name: 'fur-affinity',
  displayName: 'Fur Affinity',
})
@UserLoginFlow('https://furaffinity.net/login')
@SupportsUsernameShortcut({
  id: 'fa',
  url: 'https://furaffinity.net/user/$1',
})
@SupportsFiles(['image/png', 'image/jpeg'])
export default class FurAffinity
  extends Website<FurAffinityAccountData>
  implements
    FileWebsite<FurAffinityFileSubmission>,
    MessageWebsite<FurAffinityMessageSubmission>,
    WithCustomDescriptionParser
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
        const $ = load(res.body);
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

  onPostMessageSubmission(
    postData: PostData<FurAffinityMessageSubmission>,
    cancellationToken: CancellableToken,
  ): Promise<IPostResponse> {
    throw new Error('Method not implemented.');
  }

  async onValidateMessageSubmission(
    postData: PostData<FurAffinityMessageSubmission>,
  ): Promise<SimpleValidationResult> {
    const validator = this.createValidator<FurAffinityMessageSubmission>();

    return validator.result;
  }

  onDescriptionParse(): string {
    return 'test'; // TODO
  }

  onAfterDescriptionParse(description: string): string {
    return description;
  }
}
