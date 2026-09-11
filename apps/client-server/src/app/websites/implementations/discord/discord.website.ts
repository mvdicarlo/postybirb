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
import { CancellationToken } from '../../../posting/cancellation-token';
import { PostingFile } from '../../../posting/models/posting-file';
import FileSize from '../../../utils/filesize.util';
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
    cancellationToken: CancellationToken,
    batch: PostBatchData,
  ): Promise<IPostResponse> {
    cancellationToken.throwIfAborted();
    const { isForum } = this.websiteDataStore.getData();
    const webhookUrl = this.getWebhookUrl(batch);
    const payload = {
      ...(batch.index === 0
        ? {
            ...this.buildDescription(
              postData.options.title,
              postData.options.description,
              postData.options.useTitle,
              postData.options.useEmbed,
              files.length > 0,
            ),
          }
        : {}),
      thread_name:
        isForum && !webhookUrl.searchParams.has('thread_id')
          ? postData.options.title.trim() || 'PostyBirb Post'
          : undefined,
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
    cancellationToken.throwIfAborted();
    return this.platform.http
      .post(webhookUrl.toString(), {
        partition: undefined,
        type: 'multipart',
        data: formData,
      })
      .then((res) => this.handleResponse(res))
      .catch((error) => this.handleError(error, payload));
  }

  async onValidateFileSubmission(postData: PostData<DiscordFileSubmission>) {
    return this.validateContent(postData, true);
  }

  onPostMessageSubmission(
    postData: PostData<DiscordMessageSubmission>,
    cancellationToken: CancellationToken,
  ): Promise<IPostResponse> {
    cancellationToken.throwIfAborted();
    const { isForum } = this.websiteDataStore.getData();
    const webhookUrl = this.getWebhookUrl();
    const messageData = {
      ...this.buildDescription(
        postData.options.title,
        postData.options.description,
        postData.options.useTitle,
        postData.options.useEmbed,
      ),
      thread_name:
        isForum && !webhookUrl.searchParams.has('thread_id')
          ? postData.options.title.trim() || 'PostyBirb Post'
          : undefined,
    };
    cancellationToken.throwIfAborted();
    return this.platform.http
      .post(webhookUrl.toString(), {
        partition: undefined,
        type: 'json',
        data: messageData,
      })
      .then((res) => this.handleResponse(res))
      .catch((error) => this.handleError(error, messageData));
  }

  async onValidateMessageSubmission(
    postData: PostData<DiscordMessageSubmission>,
  ) {
    return this.validateContent(postData, false);
  }

  private validateContent(
    postData: PostData<DiscordMessageSubmission>,
    hasFiles: boolean,
  ) {
    const validator = this.createValidator<DiscordMessageSubmission>();
    const { title, description, useTitle, useEmbed } = postData.options;
    if (
      !hasFiles &&
      !description.trim() &&
      !(useEmbed && useTitle && title.trim())
    ) {
      validator.error('validation.description.required', {}, 'description');
    }
    const maxLength = useEmbed ? 4096 : 2000;
    if (description.length > maxLength) {
      validator.error(
        'validation.description.max-length',
        { currentLength: description.length, maxLength },
        'description',
      );
    }
    const { isForum, webhook } = this.websiteDataStore.getData();
    const createsThread =
      isForum && !new URL(webhook).searchParams.has('thread_id');
    const maxTitleLength = createsThread
      ? 100
      : useEmbed && useTitle
        ? 256
        : undefined;
    if (maxTitleLength && title.trim().length > maxTitleLength) {
      validator.error(
        'validation.title.max-length',
        { currentLength: title.trim().length, maxLength: maxTitleLength },
        'title',
      );
    }
    const mentionLength = useEmbed
      ? this.extractMentions(description).join(' ').length
      : 0;
    if (mentionLength > 2000) {
      validator.error(
        'validation.description.max-length',
        { currentLength: mentionLength, maxLength: 2000 },
        'description',
      );
    }
    return validator.result;
  }

  private getWebhookUrl(batch?: PostBatchData): URL {
    const { webhook, isForum } = this.websiteDataStore.getData();
    const webhookUrl = new URL(webhook);
    webhookUrl.searchParams.set('wait', 'true');

    if (
      isForum &&
      batch &&
      batch.index > 0 &&
      !webhookUrl.searchParams.has('thread_id')
    ) {
      for (const source of batch.sourceUrls ?? []) {
        let sourceUrl: URL;
        try {
          sourceUrl = new URL(source.url);
        } catch {
          continue;
        }
        if (
          sourceUrl.hostname !== 'discord.com' &&
          sourceUrl.hostname !== 'discordapp.com'
        ) {
          continue;
        }
        const match = sourceUrl.pathname.match(
          /^\/channels\/(?:\d+|@me)\/(\d+)\/\d+\/?$/,
        );
        if (match) {
          webhookUrl.searchParams.set('thread_id', match[1]);
          break;
        }
      }

      if (!webhookUrl.searchParams.has('thread_id')) {
        throw new Error(
          'Cannot continue Discord forum post without its thread ID. Set thread_id in the webhook URL or repost all files.',
        );
      }
    }

    return webhookUrl;
  }

  private handleResponse(res: HttpResponse<unknown>): IPostResponse {
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw new Error(
        `Failed to post message: ${res.statusCode ?? -1} ${JSON.stringify(res.body)}`,
      );
    }
    const message = res.body as {
      id?: string;
      channel_id?: string;
      guild_id?: string;
    } | null;
    if (
      typeof message?.id !== 'string' ||
      typeof message.channel_id !== 'string' ||
      !/^\d+$/.test(message.id) ||
      !/^\d+$/.test(message.channel_id)
    ) {
      throw new Error(
        'Discord did not confirm the posted message. Check the channel before retrying.',
      );
    }
    return PostResponse.fromWebsite(this)
      .withAdditionalInfo(res.body)
      .withSourceUrl(
        `https://discord.com/channels/${message.guild_id || '@me'}/${message.channel_id}/${message.id}`,
      );
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
    hasFiles = false,
  ) {
    const embedTitle = useEmbed && useTitle ? title.trim() : '';
    const hasDescription = description.trim().length > 0;

    if (!hasDescription && !embedTitle && !hasFiles) {
      throw new Error('No content to post');
    }

    if (!useEmbed) {
      return {
        content: hasDescription ? description : undefined,
        allowed_mentions: {
          parse: ['everyone', 'users', 'roles'],
        },
        embeds: [],
      };
    }

    const mentions = this.extractMentions(description);

    return {
      content: mentions.length ? mentions.join(' ') : undefined,
      allowed_mentions: {
        parse: ['everyone', 'users', 'roles'],
      },
      embeds:
        embedTitle || hasDescription
          ? [
              {
                title: embedTitle || undefined,
                description: hasDescription ? description : undefined,
              },
            ]
          : [],
    };
  }

  private extractMentions(description: string): string[] {
    const text = description
      .replace(/\\[\s\S]/g, '_')
      .replace(
        /^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^ {0,3}\1[~`]*[ \t]*(?:\n|$)|(?![\s\S]))/gm,
        ' ',
      )
      .replace(/(?<!`)(`+)(?!`)[\s\S]*?(?<!`)\1(?!`)/g, ' ')
      .replace(/https?:\/\/\S+|[\p{L}\p{N}_.+-]+@[\p{L}\p{N}_.-]+/gu, ' ');

    return [
      ...new Set(
        text.match(/<@[!&]?\d+>|(?<![\w@])@(?:everyone|here)\b/g) ?? [],
      ),
    ];
  }
}
