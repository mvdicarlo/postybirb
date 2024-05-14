import {
  DescriptionType,
  FileSubmission,
  ILoginState,
  ISubmissionFile,
  IWebsiteFormFields,
  MessageSubmission,
  PostData,
  PostResponse,
  ValidationResult,
} from '@postybirb/types';
import { Class } from 'type-fest';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { ImageResizeProps } from '../../../post/models/image-resize-props';
import { PostingFile } from '../../../post/models/posting-file';
import { CustomLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsDescription } from '../../decorators/supports-description.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { MessageWebsite } from '../../models/website-modifiers/message-website';
import { Website } from '../../website';
import { DiscordAccountData } from './models/discord-account-data';
import { DiscordFileSubmission } from './models/discord-file-submission';
import { DiscordMessageSubmission } from './models/discord-message-submission';

@WebsiteMetadata({
  name: 'discord',
  displayName: 'Discord',
})
@CustomLoginFlow()
@SupportsFiles({
  acceptedMimeTypes: [],
  acceptedFileSizes: {},
  fileBatchSize: 10,
})
@SupportsDescription(DescriptionType.MARKDOWN)
export default class Discord
  extends Website<DiscordAccountData>
  implements
    FileWebsite<DiscordFileSubmission>,
    MessageWebsite<DiscordMessageSubmission>
{
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
    return new this.MessageModel();
  }

  createFileModel(): DiscordFileSubmission {
    return new this.FileModel();
  }

  calculateImageResize(file: ISubmissionFile): ImageResizeProps {
    throw new Error('Method not implemented.');
  }

  onPostFileSubmission(
    postData: PostData<FileSubmission, IWebsiteFormFields>,
    files: PostingFile[],
    cancellationToken: CancellableToken
  ): Promise<PostResponse> {
    throw new Error('Method not implemented.');
  }

  onValidateFileSubmission(
    postData: PostData<FileSubmission, DiscordFileSubmission>
  ): Promise<ValidationResult> {
    throw new Error('Method not implemented.');
  }

  onPostMessageSubmission(
    postData: PostData<MessageSubmission, DiscordMessageSubmission>,
    cancellationToken: CancellableToken
  ): Promise<PostResponse> {
    throw new Error('Method not implemented.');
  }

  async onValidateMessageSubmission(
    postData: PostData<MessageSubmission, DiscordMessageSubmission>
  ): Promise<ValidationResult<DiscordMessageSubmission>> {
    const result: ValidationResult<DiscordMessageSubmission> = {
      warnings: [],
    };

    // TODO - update validation
    // if (postData.options.description.description.trim().length > 2_000) {
    //   result.warnings.push({
    //     id: 'validation.description.max-length',
    //     field: 'description',
    //     values: {
    //       maxLength: 2_000,
    //     },
    //   });
    // }

    return result;
  }
}
