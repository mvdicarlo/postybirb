// eslint-disable-next-line max-classes-per-file
import { SelectOptionSingle } from '@postybirb/form-builder';
import { Http } from '@postybirb/http';
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
import bigInt from 'big-integer';
import { Api, TelegramClient } from 'telegram';
import { CustomFile } from 'telegram/client/uploads';
import { Entity } from 'telegram/define';
import { HTMLParser as HTMLToTelegram } from 'telegram/extensions/html';
import { LogLevel } from 'telegram/extensions/Logger';
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
@SupportsFiles([
  'image/jpeg',
  'image/png',
  'image/gif',
  'video/mp4',
  'audio/mp3',
])
export default class Telegram
  extends Website<TelegramAccountData>
  implements
    FileWebsite<TelegramFileSubmission>,
    MessageWebsite<TelegramMessageSubmission>
{
  protected BASE_URL = 'https://t.me/';

  protected readonly MAX_MB = 30;

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<TelegramAccountData> =
    {
      appHash: true,
      appId: true,
      phoneNumber: true,
      channels: true,
      session: false,
    };

  private clients = new Map<number, TelegramClient>();

  private async getTelegramClient(account: TelegramAccountData) {
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
    const channels: SelectOptionSingle[] = [];
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
      : file.size > FileSize.mbToBytes(this.MAX_MB)
        ? { maxBytes: FileSize.mbToBytes(this.MAX_MB) }
        : undefined;
  }

  async onPostFileSubmission(
    postData: PostData<TelegramFileSubmission>,
    files: PostingFile[],
    _batchIndex: number,
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    cancellationToken.throwIfCancelled();
    const account = this.getWebsiteData();
    const telegram = await this.getTelegramClient(account);

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
        spoiler: postData.options.isSpoiler,
        file: uploadedFile,
        mimeType: file.mimeType,
        attributes: [],
        nosoundVideo: file.mimeType === 'image/gif',
      });

      medias.push(media);
    }

    const [description, entities] = HTMLToTelegram.parse(
      // Add newlines. All blocknote lines are wrapped using <div> without \n between them.
      postData.options.description.replaceAll('</div><div>', '</div>\n<div>'),
    );

    let mediaDescription = '';
    let mediaEntities = [];
    let messageDescription = '';
    if (description.length < 1024) {
      // Description fit image/album limit, no separate message
      mediaDescription = description;
      mediaEntities = entities;
    } else {
      messageDescription = description;
    }

    let response: Api.TypeUpdates | undefined;

    for (const channel of postData.options.channels) {
      cancellationToken.throwIfCancelled();
      const peer = this.getPeer(channel.value);

      if (medias.length === 1) {
        telegram.invoke(
          new Api.messages.SendMedia({
            media: medias[0],
            message: mediaDescription,
            entities: mediaEntities,
            silent: postData.options.isSilent,
            peer,
          }),
        );
      } else {
        const singleMedias: Api.InputSingleMedia[] = [];
        for (const [i, media] of medias.entries()) {
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

          singleMedias.push(
            new Api.InputSingleMedia({
              media,
              message: i === 0 ? mediaDescription : '',
              entities: i === 0 ? mediaEntities : [],
            }),
          );
        }

        const mediasPerBatch = 10;
        const batches = 1 + (singleMedias.length - 1) / mediasPerBatch;
        for (let i = 0; i < batches; i++) {
          response = await telegram.invoke(
            new Api.messages.SendMultiMedia({
              multiMedia: singleMedias.slice(
                i * mediasPerBatch,
                (i + 1) * mediasPerBatch,
              ),
              silent: postData.options.isSilent,
              peer,
            }),
          );
        }
      }

      if (messageDescription) {
        await telegram.sendMessage(peer, {
          message: messageDescription,
          silent: postData.options.isSilent,
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
    const id = BigInt(idRaw) as unknown as bigInt.BigInteger;
    const peer = accessHash
      ? new Api.InputPeerChannel({
          channelId: id,
          accessHash: BigInt(accessHash) as unknown as bigInt.BigInteger,
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
    const formData = {
      description: postData.options.description,
      tags: postData.options.tags.join(', '),
      title: postData.options.title,
      rating: postData.options.rating,
    };

    const result = await Http.post<string>(`${this.BASE_URL}/submit`, {
      partition: this.accountId,
      data: formData,
      type: 'multipart',
    });

    if (result.statusCode === 200) {
      return PostResponse.fromWebsite(this).withAdditionalInfo(result.body);
    }

    return PostResponse.fromWebsite(this)
      .withAdditionalInfo({
        body: result.body,
        statusCode: result.statusCode,
      })
      .withException(new Error('Failed to post'));
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
