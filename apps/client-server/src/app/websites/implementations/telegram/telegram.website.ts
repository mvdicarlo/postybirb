// eslint-disable-next-line max-classes-per-file
import { SelectOptionItem } from '@postybirb/form-builder';
import {
  CustomRouteHandlers,
  ILoginState,
  ImageResizeProps,
  ISubmissionFile,
  PostData,
  PostResponse,
  SimpleValidationResult,
  TelegramAccountData,
  TelegramCustomRoutes,
} from '@postybirb/types';
import { supportsImage } from '@postybirb/utils/file-type';
import { Api, TelegramClient } from 'telegram';
import { CustomFile } from 'telegram/client/uploads';
import { Entity } from 'telegram/define';
import { HTMLParser as HTMLToTelegram } from 'telegram/extensions/html';
import { LogLevel } from 'telegram/extensions/Logger';
import { returnBigInt } from 'telegram/Helpers';
import { StringSession } from 'telegram/sessions';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import FileSize from '../../../utils/filesize.util';
import { CustomLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { MessageWebsite } from '../../models/website-modifiers/message-website';
import { Website } from '../../website';
import { TelegramFileSubmission } from './models/telegram-file-submission';
import { TelegramMessageSubmission } from './models/telegram-message-submission';

@WebsiteMetadata({
  name: 'telegram',
  displayName: 'Telegram',
})
@CustomLoginFlow()
@SupportsFiles({
  acceptedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'video/mp4',
    'audio/mp3',
  ],
  fileBatchSize: 10,
  acceptedFileSizes: { '*': FileSize.mbToBytes(30) },
})
export default class Telegram
  extends Website<TelegramAccountData>
  implements
    FileWebsite<TelegramFileSubmission>,
    MessageWebsite<TelegramMessageSubmission>
{
  protected BASE_URL = 'https://t.me/';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<TelegramAccountData> =
    {
      appHash: true,
      appId: true,
      phoneNumber: true,
      channels: true,
      session: false,
    };

  private clients = new Map<number, TelegramClient>();

  private async getTelegramClient(
    account: TelegramAccountData = this.websiteDataStore.getData(),
  ) {
    let client = this.clients.get(account.appId);
    if (!client) {
      this.logger.info(
        `Creating client for ${account.appId} with session present ${!!account.session}`,
      );
      client = new TelegramClient(
        new StringSession(account.session ?? ''),
        account.appId,
        account.appHash,
        {},
      );
      client.setLogLevel(LogLevel.ERROR);
      this.clients.set(account.appId, client);
    }

    if (!client.connected) await client.connect();
    return client;
  }

  public onCustomRoute: CustomRouteHandlers<TelegramCustomRoutes> = {
    startAuthentication: async (request) => {
      this.logger.info('Starting Authentication');
      const account: TelegramAccountData = {
        ...this.getWebsiteData(),
        ...request,
      };
      const telegram = await this.getTelegramClient(account);
      await this.setWebsiteData(account);
      await telegram.sendCode(
        { apiId: request.appId, apiHash: request.appHash },
        request.phoneNumber,
      );
      this.logger.info('Code sent successfully');
    },
    authenticate: async (request) => {
      this.logger.info(`Authenticating`);
      const account: TelegramAccountData = {
        ...this.getWebsiteData(),
        ...request,
      };
      const telegram = await this.getTelegramClient(account);

      try {
        await telegram.start({
          phoneNumber: request.phoneNumber,
          password: async () => request.password,
          phoneCode: async () => request.code,
          onError: (error) => {
            throw error;
          },
        });
        this.logger.info('Login successfull');
        this.onLogin();
        return { success: true };
      } catch (e) {
        this.logger.error(e);
        const passwordRequired = String(e).includes('Password is empty');
        const passwordInvalid = String(e).includes('PASSWORD_HASH_INVALID');
        const codeInvalid = String(e).includes('CODE_INVALID');
        return {
          message: String(e),
          passwordRequired,
          passwordInvalid,
          codeInvalid,
          success: false,
        };
      }
    },
  };

  private async loadChannels(telegram: TelegramClient) {
    this.logger.info('Loading folders...');
    const channels: SelectOptionItem[] = [];
    let total = 0;

    for await (const dialog of telegram.iterDialogs()) {
      total++;
      if (!dialog.id || dialog.archived) continue;
      if (!this.canSendMediaInChat(dialog.entity)) continue;

      const id = dialog.entity.id.toString();
      const hash =
        dialog.entity.className === 'Channel'
          ? `|${dialog.entity.accessHash.toString()}`
          : '';

      channels.push({
        label: dialog.title ?? dialog.name,
        value: `${id}${hash}`,
      });
      this.setWebsiteData({ ...this.websiteDataStore.getData(), channels });
    }

    this.logger.info(
      `Loaded total ${total} folders, can send media in ${channels.length} folders.`,
    );
  }

  private canSendMediaInChat(chat: Entity): chat is Api.Channel | Api.Chat {
    if (chat.className !== 'Channel' && chat.className !== 'Chat') return false;
    if (chat.left) return false;

    if (
      chat.creator ||
      chat.adminRights?.postMessages ||
      // Right is not banned -> user can send media
      chat.defaultBannedRights?.sendMedia === false
    )
      return true;

    return false;
  }

  public async onLogin(): Promise<ILoginState> {
    const account = this.websiteDataStore.getData();
    if (!account.appHash || !account.appId || !account.phoneNumber) {
      return this.loginState.setLogin(false, null);
    }

    const client = await this.getTelegramClient(account);
    if (await client.isUserAuthorized()) {
      const me = await client.getMe();
      const session = (client.session as StringSession).save();
      const username = me.username ?? me.firstName ?? me.id.toString();
      this.setWebsiteData({ ...account, session });
      await this.loadChannels(client);
      return this.loginState.setLogin(true, username);
    }

    this.logger.info(
      `Not logged in with session presence ${!!account.session}`,
    );
    return this.loginState.setLogin(false, null);
  }

  createFileModel(): TelegramFileSubmission {
    return new TelegramFileSubmission();
  }

  calculateImageResize(file: ISubmissionFile): ImageResizeProps {
    return file.width > 2560 || file.height > 2560
      ? { width: 2560, height: 2560 }
      : file.size > this.decoratedProps.fileOptions.acceptedFileSizes['*']
        ? { maxBytes: this.decoratedProps.fileOptions.acceptedFileSizes['*'] }
        : undefined;
  }

  htmlToDescriptionEntities(html: string) {
    return HTMLToTelegram.parse(
      // Add newlines. All blocknote lines are wrapped using <div> without \n between them.
      html.replaceAll('</div><div>', '</div>\n<div>'),
    );
  }

  async onPostFileSubmission(
    postData: PostData<TelegramFileSubmission>,
    files: PostingFile[],
    batchIndex: number,
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    cancellationToken.throwIfCancelled();
    const telegram = await this.getTelegramClient();

    const medias: (
      | Api.InputMediaUploadedPhoto
      | Api.InputMediaUploadedDocument
    )[] = [];

    for (const file of files) {
      cancellationToken.throwIfCancelled();

      const customFile = new CustomFile(
        file.fileName,
        file.buffer.length,
        '',
        file.buffer,
      );
      const uploadedFile = await telegram.uploadFile({
        file: customFile,
        workers: 1,
      });

      const UploadedMedia = supportsImage(file.mimeType)
        ? Api.InputMediaUploadedPhoto
        : Api.InputMediaUploadedDocument;

      const media = new UploadedMedia({
        spoiler: postData.options.spoiler,
        file: uploadedFile,
        mimeType: file.mimeType,
        attributes: [],
        nosoundVideo: file.mimeType === 'image/gif',
      });

      medias.push(media);
    }

    // Hack to not add another argument to the onPostFileSubmission like totalBatches
    // This will not work when there is 20 files for example
    // Note: maybe make it either property of the post data or BatchInfo interface?
    const lastBatch =
      batchIndex !== 0 &&
      this.decoratedProps.fileOptions.fileBatchSize < files.length;

    const [description, entities] = this.htmlToDescriptionEntities(
      postData.options.description,
    );

    let mediaDescription = '';
    let mediaEntities = [];
    let messageDescription = '';

    if (description.length < 1024) {
      // Description fit image/album limit, no separate message
      mediaDescription = description;
      mediaEntities = entities;
    } else if (messageDescription && lastBatch) {
      // Send separate message with description
      messageDescription = description;
    }

    let response: Api.TypeUpdates | undefined;

    for (const channel of postData.options.channels) {
      cancellationToken.throwIfCancelled();

      // Only add description to the media in first batch
      const firstInBatch = batchIndex === 0;
      const peer = this.getPeer(channel.value);

      if (medias.length === 1) {
        telegram.invoke(
          new Api.messages.SendMedia({
            media: medias[0],
            message: firstInBatch ? mediaDescription : '',
            entities: firstInBatch ? mediaEntities : [],
            silent: postData.options.silent,
            peer,
          }),
        );
      } else {
        const multiMedia: Api.InputSingleMedia[] = [];
        for (const [mediaIndex, media] of medias.entries()) {
          const messageMedia = await telegram.invoke(
            new Api.messages.UploadMedia({ media, peer }),
          );
          const file =
            messageMedia.className === 'MessageMediaPhoto'
              ? messageMedia.photo
              : messageMedia.className === 'MessageMediaDocument'
                ? messageMedia.document
                : undefined;

          if (!file) {
            throw new Error(`Unknwon media type: ${messageMedia.className}`);
          }

          // Only add description to the first media in first batch
          const useDescription = mediaIndex === 0 && firstInBatch;

          multiMedia.push(
            new Api.InputSingleMedia({
              media,
              message: useDescription ? mediaDescription : '',
              entities: useDescription ? mediaEntities : [],
            }),
          );
        }

        response = await telegram.invoke(
          new Api.messages.SendMultiMedia({
            silent: postData.options.silent,
            multiMedia,
            peer,
          }),
        );
      }

      if (messageDescription) {
        await telegram.sendMessage(peer, {
          message: messageDescription,
          silent: postData.options.silent,
          formattingEntities: entities,
        });
      }
    }

    const postResponse = PostResponse.fromWebsite(this);
    const sourceUrl = this.getSourceFromResponse(response);
    if (sourceUrl) postResponse.withSourceUrl(sourceUrl);
    return postResponse;
  }

  private getSourceFromResponse(response?: Api.TypeUpdates) {
    if (!response || response.className !== 'Updates') return '';

    const channelUpdate = response.updates.find(
      (e) => e.className === 'UpdateNewChannelMessage',
    ) as undefined | Api.UpdateNewChannelMessage;

    const peerId = channelUpdate?.message?.peerId;
    if (peerId?.className !== 'PeerChannel') return '';

    const chat = response.chats.find((e) => e.id === peerId.channelId);
    if (!chat || chat.className !== 'Channel' || !chat.username) return '';

    return `https://t.me/${chat.username}/${channelUpdate.message.id}`;
  }

  private getPeer(channel: string) {
    const [idRaw, accessHash] = channel.split('|');
    const id = returnBigInt(idRaw);
    const peer = accessHash
      ? new Api.InputPeerChannel({
          channelId: id,
          accessHash: returnBigInt(accessHash),
        })
      : new Api.InputPeerChat({ chatId: id });

    return peer;
  }

  async onValidateFileSubmission(
    postData: PostData<TelegramFileSubmission>,
  ): Promise<SimpleValidationResult> {
    return {
      warnings: [],
      errors: [],
    };
  }

  createMessageModel(): TelegramMessageSubmission {
    return new TelegramMessageSubmission();
  }

  async onPostMessageSubmission(
    postData: PostData<TelegramMessageSubmission>,
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    cancellationToken.throwIfCancelled();
    let response: Api.TypeUpdates | undefined;
    const [description, entities] = this.htmlToDescriptionEntities(
      postData.options.description,
    );
    const telegram = await this.getTelegramClient();

    for (const channel of postData.options.channels) {
      cancellationToken.throwIfCancelled();

      response = await telegram.invoke(
        new Api.messages.SendMessage({
          message: description,
          entities,
          silent: postData.options.silent,
          peer: this.getPeer(channel.value),
        }),
      );
    }

    const postResponse = PostResponse.fromWebsite(this);
    const sourceUrl = this.getSourceFromResponse(response);
    if (sourceUrl) postResponse.withSourceUrl(sourceUrl);
    return postResponse;
  }

  async onValidateMessageSubmission(
    postData: PostData<TelegramMessageSubmission>,
  ): Promise<SimpleValidationResult> {
    return {
      warnings: [],
      errors: [],
    };
  }
}
