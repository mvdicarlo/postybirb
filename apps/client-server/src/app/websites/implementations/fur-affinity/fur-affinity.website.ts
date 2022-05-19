import { Http } from '@postybirb/http';
import { FurAffinityMetadata } from '@postybirb/website-metadata';
import { load } from 'cheerio';
import { Class } from 'type-fest';
import { FileSubmission } from '../../../submission/models/file-submission';
import { MessageSubmission } from '../../../submission/models/message-submission';
import PostData from '../../../submission/models/post-data';
import { UserLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsUsernameShortcut } from '../../decorators/supports-username-shortcuts.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { ILoginState } from '../../models/login-state';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { MessageWebsite } from '../../models/website-modifiers/message-website';
import { Website } from '../../website';
import { FurAffinityAccountData } from './models/fur-affinity-account-data';
import { FurAffinityFileSubmission } from './models/fur-affinity-file-submission';
import { FurAffinityMessageSubmission } from './models/fur-affinity-message-submission';

@WebsiteMetadata(FurAffinityMetadata)
@UserLoginFlow('https://furaffinity.net/login')
@SupportsUsernameShortcut({
  id: 'fa',
  url: 'https://furaffinity.net/user/$1',
})
export default class FurAffinity
  extends Website<FurAffinityAccountData>
  implements
    FileWebsite<FurAffinityFileSubmission>,
    MessageWebsite<FurAffinityMessageSubmission>
{
  FileModel: Class<FurAffinityFileSubmission>;

  MessageModel: Class<FurAffinityMessageSubmission>;

  supportsFile: true;

  supportsAdditionalFiles: boolean = false;

  supportsMessage: true = true;

  protected BASE_URL: string = 'https://furaffinity.net';

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
    throw new Error('Method not implemented.');
  }

  onPostFileSubmission(
    postData: PostData<FurAffinityFileSubmission>,
    cancellationToken: unknown
  ): Promise<unknown> {
    throw new Error('Method not implemented.');
  }

  onValidateFileSubmission(
    submissionData: FileSubmission,
    postData: PostData<FurAffinityFileSubmission>
  ): Promise<unknown> {
    throw new Error('Method not implemented.');
  }

  createMessageModel(): FurAffinityMessageSubmission {
    throw new Error('Method not implemented.');
  }

  onPostMessageSubmission(
    postData: PostData<FurAffinityMessageSubmission>,
    cancellationToken: unknown
  ): Promise<unknown> {
    throw new Error('Method not implemented.');
  }

  onValidateMessageSubmission(
    submissionData: MessageSubmission,
    postData: PostData<FurAffinityMessageSubmission>
  ): Promise<unknown> {
    throw new Error('Method not implemented.');
  }
}
