import { DiscordMetadata } from '@postybirb/website-metadata';
import { Class } from 'type-fest';
import { FileSubmission } from '../../../submission/models/file-submission.model';
import { MessageSubmission } from '../../../submission/models/message-submission.model';
import PostData from '../../../submission/models/post-data.model';
import { CustomLoginFlow } from '../../decorators/login-flow.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility.type';
import { ILoginState } from '../../models/login-state.interface';
import { FileWebsite } from '../../models/website-modifier-interfaces/file-website.interface';
import { MessageWebsite } from '../../models/website-modifier-interfaces/message-website.interface';
import { Website } from '../../website';
import { DiscordAccountData } from './models/discord-account-data';
import { DiscordFileSubmission } from './models/discord-file-submission.model';
import { DiscordMessageSubmission } from './models/discord-message-submission.model';

@WebsiteMetadata(DiscordMetadata)
@CustomLoginFlow()
export default class Discord
  extends Website<DiscordAccountData>
  implements
    FileWebsite<DiscordFileSubmission>,
    MessageWebsite<DiscordMessageSubmission>
{
  supportsFile: true = true;

  supportsMessage: true = true;

  supportsAdditionalFiles: boolean = true;

  FileModel: Class<DiscordFileSubmission> = DiscordFileSubmission;

  MessageModel: Class<DiscordMessageSubmission> = DiscordMessageSubmission;

  protected BASE_URL: string;

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<DiscordAccountData> =
    {
      webhook: true,
    };

  public async onLogin(): Promise<ILoginState> {
    const data = this.websiteDataStore.getData();
    if (data.webhook) {
      return this.loginState.setLogin(true, '');
    }

    return this.loginState.setLogin(false, null);
  }

  createMessageModel(): DiscordMessageSubmission {
    throw new Error('Method not implemented.');
  }

  createFileModel(): DiscordFileSubmission {
    throw new Error('Method not implemented.');
  }

  onPostFileSubmission(
    postData: PostData<DiscordFileSubmission>,
    cancellationToken: unknown
  ): Promise<unknown> {
    throw new Error('Method not implemented.');
  }

  onValidateFileSubmission(
    submissionData: FileSubmission,
    postData: PostData<DiscordFileSubmission>
  ): Promise<unknown> {
    throw new Error('Method not implemented.');
  }

  onPostMessageSubmission(
    postData: PostData<DiscordMessageSubmission>,
    cancellationToken: unknown
  ): Promise<unknown> {
    throw new Error('Method not implemented.');
  }

  onValidateMessageSubmission(
    submissionData: MessageSubmission,
    postData: PostData<DiscordMessageSubmission>
  ): Promise<unknown> {
    throw new Error('Method not implemented.');
  }
}
