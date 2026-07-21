import { HttpResponse } from '@postybirb/http/types';
import {
  DiscordAccountData,
  ImageResizeProps,
  IPostResponse,
  LoginResult,
  PostData,
  PostResponse,
} from '@postybirb/types';
import { BaseConverter } from '../../../post-parsers/models/description-node/converters/base-converter';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import FileSize from '../../../utils/filesize.util';
import { validatorPassthru } from '../../commons/validator-passthru';
import { DisableAds } from '../../decorators/disable-ads.decorator';
import { CustomLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import {
  FileWebsite,
  PostBatchData,
} from '../../models/website-modifiers/file-website';
import { MessageWebsite } from '../../models/website-modifiers/message-website';
import { WithCustomDescriptionParser } from '../../models/website-modifiers/with-custom-description-parser';
import {
  DynamicFileSizeLimits,
  WithDynamicFileSizeLimits,
} from '../../models/website-modifiers/with-dynamic-file-size-limits';
import { Website } from '../../website';
import { DiscordDescriptionConverter } from './discord-description-converter';
import { DiscordFileSubmission } from './models/discord-file-submission';
import { DiscordMessageSubmission } from './models/discord-message-submission';

@WebsiteMetadata({
  name: 'discord',
  displayName: 'Discord',
  minimumPostWaitInterval: 60_000,
})
@CustomLoginFlow()
@SupportsFiles({
  acceptedMimeTypes: [],
  fileBatchSize: 10,
})
@DisableAds()
export default class Discord
  extends Website<DiscordAccountData>
  implements
    FileWebsite<DiscordFileSubmission>,
    MessageWebsite<DiscordMessageSubmission>,
    WithDynamicFileSizeLimits,
    WithCustomDescriptionParser
{
  protected BASE_URL: string;

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<DiscordAccountData> =
    {
      webhook: true,
      serverLevel: true,
      isForum: true,
    };

  public async onLogin(): Promise<LoginResult> {
    const data = this.websiteDataStore.getData();
    if (data.webhook) {
      return { loggedIn: true, username: this.account.name };
    }

    if (
      this.decoratedProps.fileOptions?.acceptedFileSizes &&
      data.serverLevel > 0
    ) {
      // NOTE: Not entirely sure if this is a safe thing to do, but it does
      // avoid having to create additional custom validation logic.
      if (data.serverLevel === 2) {
        this.decoratedProps.fileOptions.acceptedFileSizes['*'] =
          FileSize.megabytes(50);
      }
      if (data.serverLevel === 3) {
        this.decoratedProps.fileOptions.acceptedFileSizes['*'] =
          FileSize.megabytes(100);
      }
    }

    return { loggedIn: false };
  }

  getDescriptionConverter(): BaseConverter {
    return new DiscordDescriptionConverter();
  }

  createMessageModel(): DiscordMessageSubmission {
    return new DiscordMessageSubmission();
  }

  createFileModel(): DiscordFileSubmission {
    return new DiscordFileSubmission();
  }

  calculateImageResize(): ImageResizeProps | undefined {
    return undefined;
  }

  getDynamicFileSizeLimits(): DynamicFileSizeLimits {
    const data = this.websiteDataStore.getData();
    switch (data.serverLevel) {
      case 2:
        return { '*': FileSize.megabytes(50) };
      case 3:
        return { '*': FileSize.megabytes(100) };
      case 0:
      case 1:
      default:
        return { '*': FileSize.megabytes(10) };
    }
  }

  onPostFileSubmission(
    postData: PostData<DiscordFileSubmission>,
    files: PostingFile[],
    cancellationToken: CancellableToken,
    batch: PostBatchData,
  ): Promise<IPostResponse> {
    cancellationToken.throwIfCancelled();
    const { webhook } = this.websiteDataStore.getData();
    const payload = {
      ...(batch.index === 0
        ? {
            ...this.buildDescription(
              postData.options.title,
              postData.options.description,
              postData.options.useTitle,
              postData.options.useEmbed,
            ),
          }
        : {}),
      attachments: [] as object[],
    };

    const formData: {
      [key: string]: unknown;
    } = {};
    const { isSpoiler } = postData.options;
    files.forEach((file, i) => {
      const postableFile = file.toPostFormat();
      if (isSpoiler) {
        postableFile.setFileName(`SPOILER_${postableFile.fileName}`);
      }
      formData[`files[${i}]`] = postableFile;
      payload.attachments.push({
        id: i,
        filename: postableFile.fileName,
        description: file.metadata.altText,
      });
    });

    formData.payload_json = JSON.stringify(payload);
    cancellationToken.throwIfCancelled();
    return this.platform.http
      .post(webhook, {
        partition: undefined,
        type: 'multipart',
        data: formData,
      })
      .then((res) => this.handleResponse(res))
      .catch((error) => this.handleError(error, payload));
  }

  onValidateFileSubmission = validatorPassthru;

  onPostMessageSubmission(
    postData: PostData<DiscordMessageSubmission>,
    cancellationToken: CancellableToken,
  ): Promise<IPostResponse> {
    cancellationToken.throwIfCancelled();
    const { webhook } = this.websiteDataStore.getData();
    const messageData = this.buildDescription(
      postData.options.title,
      postData.options.description,
      postData.options.useTitle,
      postData.options.useEmbed,
    );
    cancellationToken.throwIfCancelled();
    return this.platform.http
      .post(webhook, {
        partition: undefined,
        type: 'json',
        data: messageData,
      })
      .then((res) => this.handleResponse(res))
      .catch((error) => this.handleError(error, messageData));
  }

  onValidateMessageSubmission = validatorPassthru;

  private handleResponse(res: HttpResponse<unknown>): IPostResponse {
    if (res.statusCode >= 300) {
      throw new Error(
        `Failed to post message: ${res.statusCode ?? -1} ${res.body}`,
      );
    }
    return PostResponse.fromWebsite(this).withAdditionalInfo(res.body);
  }

  private handleError(error: Error, payload: unknown): IPostResponse {
    this.logger.error(
      'Failed to post message',
      error.message,
      error.stack,
      JSON.stringify(payload, null, 1),
    );
    return PostResponse.fromWebsite(this)
      .withException(error)
      .withAdditionalInfo(payload);
  }

  private buildDescription(
    title: string,
    description: string,
    useTitle: boolean,
    useEmbed: boolean,
  ) {
    const { isForum } = this.websiteDataStore.getData();

    if (!useEmbed) {
      if (!description) throw new Error('No content to post');

      return {
        content: description,
        allowed_mentions: {
          parse: ['everyone', 'users', 'roles'],
        },
        embeds: [],
        thread_name: isForum ? title || 'PostyBirb Post' : undefined,
      };
    }

    if (!description && !useTitle) {
      throw new Error('No content to post');
    }

    const mentions =
      description?.match(/(<){0,1}@(&){0,1}[a-zA-Z0-9]+(>){0,1}/g) || [];

    return {
      content: mentions.length ? mentions.join(' ') : undefined,
      allowed_mentions: {
        parse: ['everyone', 'users', 'roles'],
      },
      embeds: [
        {
          title: useTitle ? title : undefined,
          description: description?.length ? description : undefined,
        },
      ],
      thread_name: isForum ? title || 'PostyBirb Post' : undefined,
    };
  }
}
