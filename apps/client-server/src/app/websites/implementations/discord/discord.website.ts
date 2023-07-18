import {
  ILoginState,
  FileSubmission,
  MessageSubmission,
  PostData,
  ValidationResult,
} from '@postybirb/types';
import { DiscordMetadata } from '@postybirb/website-metadata';
import { Class } from 'type-fest';
import { CustomLoginFlow } from '../../decorators/login-flow.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { MessageWebsite } from '../../models/website-modifiers/message-website';
import { Website } from '../../website';
import { DiscordAccountData } from './models/discord-account-data';
import { DiscordFileSubmission } from './models/discord-file-submission';
import { DiscordMessageSubmission } from './models/discord-message-submission';

@WebsiteMetadata(DiscordMetadata)
@CustomLoginFlow()
export default class Discord
  extends Website<DiscordAccountData>
  implements
    FileWebsite<DiscordFileSubmission>,
    MessageWebsite<DiscordMessageSubmission>
{
  supportsAdditionalFiles = true;

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
    postData: PostData<FileSubmission, DiscordFileSubmission>,
    cancellationToken: unknown
  ): Promise<unknown> {
    throw new Error('Method not implemented.');
  }

  onValidateFileSubmission(
    postData: PostData<FileSubmission, DiscordFileSubmission>
  ): Promise<ValidationResult> {
    throw new Error('Method not implemented.');
  }

  onPostMessageSubmission(
    postData: PostData<MessageSubmission, DiscordMessageSubmission>,
    cancellationToken: unknown
  ): Promise<unknown> {
    throw new Error('Method not implemented.');
  }

  async onValidateMessageSubmission(
    postData: PostData<MessageSubmission, DiscordMessageSubmission>
  ): Promise<ValidationResult<DiscordMessageSubmission>> {
    const result: ValidationResult<DiscordMessageSubmission> = {
      warnings: [],
    };

    if (postData.options.description.description.trim().length > 2_000) {
      result.warnings.push({
        id: 'validation.description.max-length',
        field: 'description',
        values: {
          maxLength: 2_000,
        },
      });
    }

    return result;
  }
}
