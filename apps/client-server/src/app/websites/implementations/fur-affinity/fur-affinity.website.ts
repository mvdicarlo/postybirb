import { Http } from '@postybirb/http';
import {
  FileSubmission,
  ILoginState,
  ISubmissionFile,
  MessageSubmission,
  PostData,
  PostResponse,
  ValidationResult,
} from '@postybirb/types';
import { load } from 'cheerio';
import { Class } from 'type-fest';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { ImageResizeProps } from '../../../post/models/image-resize-props';
import { PostingFile } from '../../../post/models/posting-file';
import { UserLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { SupportsTags } from '../../decorators/supports-tags.decorator';
import { SupportsUsernameShortcut } from '../../decorators/supports-username-shortcuts.decorator';
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
})
@UserLoginFlow('https://furaffinity.net/login')
@SupportsUsernameShortcut({
  id: 'fa',
  url: 'https://furaffinity.net/user/$1',
})
@SupportsTags()
@SupportsFiles(['image/png', 'image/jpeg'])
export default class FurAffinity
  extends Website<FurAffinityAccountData>
  implements
    FileWebsite<FurAffinityFileSubmission>,
    MessageWebsite<FurAffinityMessageSubmission>
{
  FileModel: Class<FurAffinityFileSubmission> = FurAffinityFileSubmission;

  MessageModel: Class<FurAffinityMessageSubmission> =
    FurAffinityMessageSubmission;

  protected BASE_URL = 'https://furaffinity.net';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<FurAffinityAccountData> =
    {
      folders: true,
    };

  public async onLogin(): Promise<ILoginState> {
    const res = await Http.get<string>(
      `${this.BASE_URL}/controls/submissions`,
      { partition: this.accountId }
    );

    if (res.body.includes('logout-link')) {
      const $ = load(res.body);
      return this.loginState.setLogin(
        true,
        $('.loggedin_user_avatar').attr('alt')
      );
    }

    return this.loginState.setLogin(false, null);
  }

  createFileModel(): FurAffinityFileSubmission {
    return new this.FileModel();
  }

  calculateImageResize(file: ISubmissionFile): ImageResizeProps {
    throw new Error('Method not implemented.');
  }

  onPostFileSubmission(
    postData: PostData<FileSubmission, FurAffinityFileSubmission>,
    files: PostingFile[],
    cancellationToken: CancellableToken
  ): Promise<PostResponse> {
    throw new Error('Method not implemented.');
  }

  onValidateFileSubmission(
    postData: PostData<FileSubmission, FurAffinityFileSubmission>
  ): Promise<ValidationResult> {
    throw new Error('Method not implemented.');
  }

  createMessageModel(): FurAffinityMessageSubmission {
    return new this.MessageModel();
  }

  onPostMessageSubmission(
    postData: PostData<FileSubmission, FurAffinityMessageSubmission>,
    cancellationToken: CancellableToken
  ): Promise<PostResponse> {
    throw new Error('Method not implemented.');
  }

  onValidateMessageSubmission(
    postData: PostData<MessageSubmission, FurAffinityMessageSubmission>
  ): Promise<ValidationResult> {
    throw new Error('Method not implemented.');
  }
}
