import {
  CustomAccountData,
  DescriptionType,
  ILoginState,
  ImageResizeProps,
  IPostResponse,
  ISubmissionFile,
  PostData,
  PostResponse,
} from '@postybirb/types';
import { chunk } from 'lodash';
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
import { WithRuntimeDescriptionParser } from '../../models/website-modifiers/with-runtime-description-parser';
import { Website } from '../../website';
import { CustomFileSubmission } from './models/custom-file-submission';
import { CustomMessageSubmission } from './models/custom-message-submission';

@WebsiteMetadata({
  name: 'custom',
  displayName: 'Custom',
})
@CustomLoginFlow()
@SupportsFiles({
  acceptedMimeTypes: [],
  acceptsExternalSourceUrls: true,
})
export default class Custom
  extends Website<CustomAccountData>
  implements
    FileWebsite<CustomFileSubmission>,
    MessageWebsite<CustomMessageSubmission>,
    WithRuntimeDescriptionParser
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
      thumbnailField: true,
      titleField: true,
      altTextField: true,
      fileBatchLimit: true,
    };

  public async onLogin(): Promise<ILoginState> {
    const data = this.websiteDataStore.getData();
    // HACK: Ensure any initial data is processed
    this.onWebsiteDataChange(data);

    // Check if we have either a file URL or notification URL configured
    if (data?.fileUrl || data?.notificationUrl) {
      const displayName = data.fileUrl || data.notificationUrl;
      return this.loginState.setLogin(true, displayName || null);
    }

    return this.loginState.setLogin(false, null);
  }

  async onWebsiteDataChange(newData: CustomAccountData): Promise<void> {
    this.logger.info('Website data updated');
    if (this.decoratedProps.fileOptions) {
      this.decoratedProps.fileOptions.fileBatchSize = Math.max(
        newData.fileBatchLimit || 1,
        1,
      );
    }
  }

  createFileModel(): CustomFileSubmission {
    return new CustomFileSubmission();
  }

  calculateImageResize(file: ISubmissionFile): ImageResizeProps | undefined {
    return undefined;
  }

  private buildBaseForm(
    postData: PostData<CustomMessageSubmission>,
    cancellationToken: CancellableToken,
    data: CustomAccountData,
  ) {
    const { options } = postData;

    // Prepare form data using the custom field mappings
    const builder = new PostBuilder(this, cancellationToken)
      .asMultipart()
      .setField(data.titleField || 'title', options.title)
      .setField(data.descriptionField || 'description', options.description)
      .setField(data.tagField || 'tags', options.tags.join(','))
      .setField(data.ratingField || 'rating', options.rating);

    // Add custom headers
    if (data.headers) {
      data.headers.forEach((header) => {
        if (header.name && header.value) {
          builder.withHeader(header.name, header.value);
        }
      });
    }

    return builder;
  }

  async onPostFileSubmission(
    postData: PostData<CustomFileSubmission>,
    files: PostingFile[],
    cancellationToken: CancellableToken,
  ): Promise<IPostResponse> {
    cancellationToken.throwIfCancelled();

    const data = this.websiteDataStore.getData();

    if (!data?.fileUrl) {
      throw new Error('Custom website was not provided a File Posting URL.');
    }

    const batches = chunk(files, data.fileBatchLimit ?? Infinity);

    const results: Record<string, unknown>[] = [];

    for (const [batchIndex, batch] of batches.entries()) {
      try {
        const builder = this.buildBaseForm(postData, cancellationToken, data);

        // Add files
        const fileFieldName = data.fileField || 'file';
        if (batch.length > 1) {
          builder.addFiles(fileFieldName, batch);
        } else {
          builder.addFile(fileFieldName, batch[0]);
        }

        // Add files metadata
        batch.forEach((file, index) => {
          const { altText } = file.metadata;
          const altTextField = data.altTextField || 'altText';
          if (altTextField) {
            builder.setField(`${altTextField}[${index}]`, altText);
          }

          if (data.thumbnailField && !!file.thumbnail) {
            builder.setField(
              `${data.thumbnailField}[${index}]`,
              file.thumbnailToPostFormat(),
            );
          }

          const sourceUrlsField = data.sourceUrlsField || 'sourceUrls';
          if (sourceUrlsField) {
            builder.setField(
              `${sourceUrlsField}[${index}]`,
              file.metadata.sourceUrls,
            );
          }
        });

        const result = await builder.send<unknown>(data.fileUrl);

        if (result.statusCode === 200) {
          results.push({
            ...result,
            sentBody: builder.getSanitizedData(),
          });
        } else {
          return PostResponse.fromWebsite(this)
            .withAdditionalInfo({
              statusCode: result.statusCode,
              statusMessage: result.statusMessage,
              responseBody: result.body,
              sentBody: builder.getSanitizedData(),
            })
            .withException(
              new Error(
                `Failed to post to custom website: ${result.statusCode} ${result.statusMessage}`,
              ),
            );
        }
      } catch (error) {
        this.logger.error(
          'Unexpected error during custom file submission',
          error,
        );
        return PostResponse.fromWebsite(this)
          .withException(error)
          .withAdditionalInfo({
            fileCount: files.length,
            batchIndex,
            totalBatches: batches.length,
          });
      }
    }

    return PostResponse.fromWebsite(this).withAdditionalInfo({ results });
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
        throw new Error(
          'Custom website was not provided a Notification Posting URL.',
        );
      }

      const builder = this.buildBaseForm(postData, cancellationToken, data);

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
      this.logger.error(
        'Unexpected error during custom message submission',
        error,
      );
      return PostResponse.fromWebsite(this).withException(error);
    }
  }

  onValidateMessageSubmission = validatorPassthru;

  getRuntimeParser(): DescriptionType {
    const { descriptionType } = this.getWebsiteData();
    switch (descriptionType) {
      case 'bbcode':
        return DescriptionType.BBCODE;
      case 'md':
        return DescriptionType.MARKDOWN;
      case 'text':
        return DescriptionType.PLAINTEXT;
      case 'html':
      default:
        return DescriptionType.HTML;
    }
  }
}
