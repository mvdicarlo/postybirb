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
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Dialog } from 'telegram/tl/custom/dialog';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
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
@SupportsFiles(['image/png', 'image/jpeg'])
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

  private async getClient(account: TelegramAccountData) {
    let client = this.clients.get(account.appId);
    if (!client) {
      client = new TelegramClient(
        new StringSession(account.session ?? ''),
        account.appId,
        account.appHash,
        {},
      );
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
        session: undefined,
      };
      const client = await this.getClient(account);
      await this.setWebsiteData(account);
      await client.sendCode(
        { apiId: request.appId, apiHash: request.appHash },
        request.phoneNumber,
      );
      this.logger.info('Code sent successfully');
    },
    authenticate: async (request) => {
      this.logger.info(
        `Authenticating with ${request.code} and ${!!request.password}`,
      );
      const account: TelegramAccountData = {
        ...this.getWebsiteData(),
        ...request,
        session: undefined,
      };
      const client = await this.getClient(account);

      try {
        await client.start({
          phoneNumber: request.phoneNumber,
          password: async () => request.password,
          phoneCode: async () => request.code,
          onError: (error) => {
            throw error;
          },
        });
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

  private async loadChannels(client: TelegramClient) {
    this.logger.info('Loading folders');
    const channels: SelectOptionSingle[] = [];
    let total = 0;

    for await (const dialog of client.iterDialogs({ ignoreMigrated: true })) {
      total++;
      if (!this.canSendMediaInChat(dialog)) continue;
      if (!dialog.id) continue;

      const id = dialog.id.toString();
      if (channels.some((e) => e.value === id)) continue;

      channels.push({
        label: dialog.title ?? dialog.name,
        value: dialog.id.toString(),
      });
      this.setWebsiteData({ ...this.getWebsiteData(), channels });
    }

    this.logger.info(
      `Loaded folders ${total} total and ${channels.length} filtered`,
    );
  }

  private canSendMediaInChat(chat: Dialog) {
    if (chat.archived) return false;
    if (chat.isUser) return false;

    return true;
  }

  public async onLogin(): Promise<ILoginState> {
    const account = this.getWebsiteData();
    if (!account.appHash || !account.appId || !account.phoneNumber) {
      return this.loginState.setLogin(false, null);
    }

    const client = await this.getClient(account);
    if (await client.isUserAuthorized()) {
      const me = await client.getMe();
      const session = (client.session as StringSession).save();
      const username = me.username ?? me.firstName ?? me.id.toString();
      this.setWebsiteData({ ...account, session });
      this.logger.info(`Saving session ${session}`);
      await this.loadChannels(client);
      return this.loginState.setLogin(true, username);
    }

    this.logger.info(`Not logged in with session ${account.session}`);
    return this.loginState.setLogin(false, null);
  }

  createFileModel(): TelegramFileSubmission {
    return new TelegramFileSubmission();
  }

  calculateImageResize(file: ISubmissionFile): ImageResizeProps {
    return undefined;
  }

  async onPostFileSubmission(
    postData: PostData<TelegramFileSubmission>,
    files: PostingFile[],
    batchIndex: number,
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    cancellationToken.throwIfCancelled();
    const formData = {
      file: files[0].toPostFormat(),
      thumb: files[0].thumbnailToPostFormat(),
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
