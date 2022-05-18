import { Http } from '@postybirb/http';
import { FurAffinityMetadata } from '@postybirb/website-metadata';
import { load } from 'cheerio';
import { Class } from 'type-fest';
import { FileSubmission } from '../../../submission/models/file-submission.model';
import { MessageSubmission } from '../../../submission/models/message-submission.model';
import PostData from '../../../submission/models/post-data.model';
import { UserLoginFlow } from '../../decorators/login-flow.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility.type';
import { ILoginState } from '../../models/login-state.interface';
import { FileWebsite } from '../../models/website-modifier-interfaces/file-website.interface';
import { MessageWebsite } from '../../models/website-modifier-interfaces/message-website.interface';
import { Website } from '../../website';
import { FurAffinityAccountData } from './models/fur-affinity-account-data';
import { FurAffinityFileSubmission } from './models/fur-affinity-file-submission.model';
import { FurAffinityMessageSubmission } from './models/fur-affinity-message-submission.model';

// ? Should I make the file website and message website a decorator?
@WebsiteMetadata(FurAffinityMetadata)
@UserLoginFlow('https://furaffinity.net/login')
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
