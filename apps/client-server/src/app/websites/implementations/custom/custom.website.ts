import {
  CustomAccountData,
  ILoginState,
  ImageResizeProps,
  IPostResponse,
  ISubmissionFile,
  PostData,
  PostResponse
} from '@postybirb/types';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import { PostBuilder } from '../../commons/post-builder';
import { validatorPassthru } from '../../commons/validator-passthru';
import { CustomLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { MessageWebsite } from '../../models/website-modifiers/message-website';
import { Website } from '../../website';
import { CustomFileSubmission } from './models/custom-file-submission';
import { CustomMessageSubmission } from './models/custom-message-submission';

@WebsiteMetadata({
  name: 'custom',
  displayName: 'Custom',
})
@CustomLoginFlow()
@SupportsFiles([])
export default class Custom
  extends Website<CustomAccountData>
  implements
    FileWebsite<CustomFileSubmission>,
    MessageWebsite<CustomMessageSubmission>
{
  protected BASE_URL = '';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<CustomAccountData> =
    {
      descriptionField: true,
      descriptionType: true,
      fileField: true,
      fileUrl: true,
      headers: true,
      notificationUrl: true,
      ratingField: true,
      tagField: true,
      thumbnaiField: true,
      titleField: true,
      altTextField: true,
    };

  public async onLogin(): Promise<ILoginState> {
    const data = this.websiteDataStore.getData();

    // Check if we have either a file URL or notification URL configured
    if (data?.fileUrl || data?.notificationUrl) {
      const displayName = data.fileUrl || data.notificationUrl;
      return this.loginState.setLogin(true, displayName);
    }

    return this.loginState.setLogin(false, null);
  }

  createFileModel(): CustomFileSubmission {
    return new CustomFileSubmission();
  }

  calculateImageResize(file: ISubmissionFile): ImageResizeProps {
    return undefined;
  }

  async onPostFileSubmission(
    postData: PostData<CustomFileSubmission>,
    files: PostingFile[],
    batchIndex: number,
    cancellationToken: CancellableToken,
  ): Promise<IPostResponse> {
    try {
      cancellationToken.throwIfCancelled();

      const data = this.websiteDataStore.getData();
      
      if (!data?.fileUrl) {
        throw new Error('Custom website was not provided a File Posting URL.');
      }

      const { options } = postData;

      // Prepare form data using the custom field mappings
      const builder = new PostBuilder(this, cancellationToken)
        .asMultipart()
        .setField(data.titleField || 'title', options.title)
        .setField(
          data.descriptionField || 'description', 
          this.parseDescription(options.description, data.descriptionType)
        )
        .setField(data.tagField || 'tags', options.tags.join(','))
        .setField(data.ratingField || 'rating', options.rating);

      // Add files
      const fileFieldName = data.fileField || 'file';
      files.forEach((file, index) => {
        if (files.length === 1) {
          builder.addFile(fileFieldName, file);
        } else {
          builder.addFile(`${fileFieldName}[${index}]`, file);
        }
      });

      // Add thumbnail if provided
      if (data.thumbnaiField) {
        builder.setConditional(
          data.thumbnaiField,
          !!files[0]?.thumbnail,
          files[0].thumbnailToPostFormat(),
        );
      }

      // Add alt text if provided (this would need to be custom data for PostingFile)
      if (data.altTextField) {
        files.forEach((file, index) => {
          const altText = ''; // PostingFile doesn't have altText property in this version
          if (files.length === 1) {
            builder.setField(data.altTextField, altText);
          } else {
            builder.setField(`${data.altTextField}[${index}]`, altText);
          }
        });
      }

      // Add custom headers
      if (data.headers) {
        data.headers.forEach(header => {
          if (header.name && header.value) {
            builder.withHeader(header.name, header.value);
          }
        });
      }

      const result = await builder.send<unknown>(data.fileUrl);

      if (result.statusCode === 200) {
        return PostResponse.fromWebsite(this).withAdditionalInfo(result.body);
      }

      return PostResponse.fromWebsite(this)
        .withAdditionalInfo({
          body: result.body,
          statusCode: result.statusCode,
        })
        .withException(new Error('Failed to post to custom webhook'));
    } catch (error) {
      this.logger.error('Unexpected error during custom file submission', error);
      return PostResponse.fromWebsite(this)
        .withException(
          error instanceof Error ? error : new Error(String(error)),
        )
        .withAdditionalInfo({ postData, files, batchIndex });
    }
  }

  onValidateFileSubmission = validatorPassthru;

  createMessageModel(): CustomMessageSubmission {
    return new CustomMessageSubmission();
  }

  async onPostMessageSubmission(
    postData: PostData<CustomMessageSubmission>,
    cancellationToken: CancellableToken,
  ): Promise<IPostResponse> {
    try {
      cancellationToken.throwIfCancelled();

      const data = this.websiteDataStore.getData();
      
      if (!data?.notificationUrl) {
        throw new Error('Custom website was not provided a Notification Posting URL.');
      }

      const { options } = postData;

      // Prepare form data using the custom field mappings
      const builder = new PostBuilder(this, cancellationToken)
        .asMultipart()
        .setField(data.titleField || 'title', options.title)
        .setField(
          data.descriptionField || 'description', 
          this.parseDescription(options.description, data.descriptionType)
        )
        .setField(data.tagField || 'tags', options.tags.join(','))
        .setField(data.ratingField || 'rating', options.rating);

      // Add custom headers
      if (data.headers) {
        data.headers.forEach(header => {
          if (header.name && header.value) {
            builder.withHeader(header.name, header.value);
          }
        });
      }

      const result = await builder.send<unknown>(data.notificationUrl);

      if (result.statusCode === 200) {
        return PostResponse.fromWebsite(this).withAdditionalInfo(result.body);
      }

      return PostResponse.fromWebsite(this)
        .withAdditionalInfo({
          body: result.body,
          statusCode: result.statusCode,
        })
        .withException(new Error('Failed to post to custom webhook'));
    } catch (error) {
      this.logger.error('Unexpected error during custom message submission', error);
      return PostResponse.fromWebsite(this)
        .withException(
          error instanceof Error ? error : new Error(String(error)),
        )
        .withAdditionalInfo({ postData });
    }
  }

  onValidateMessageSubmission = validatorPassthru;

  private parseDescription(description: string, descriptionType?: string): string {
    // For now, return as-is. In the future, this could implement 
    // parsing for different description types (markdown, bbcode, etc.)
    // similar to the legacy implementation
    return description;
  }
}
