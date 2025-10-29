import { SelectOption } from '@postybirb/form-builder';
import { Http } from '@postybirb/http';
import {
  FileType,
  ILoginState,
  ImageResizeProps,
  ISubmissionFile,
  PostData,
  PostResponse,
  SimpleValidationResult,
} from '@postybirb/types';
import parse, { HTMLElement } from 'node-html-parser';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import { DisableAds } from '../../decorators/disable-ads.decorator';
import { UserLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { SupportsUsernameShortcut } from '../../decorators/supports-username-shortcut.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { MessageWebsite } from '../../models/website-modifiers/message-website';
import { Website } from '../../website';
import { SubscribeStarAccountData } from './models/subscribe-star-account-data';
import { SubscribeStarFileSubmission } from './models/subscribe-star-file-submission';
import { SubscribeStarMessageSubmission } from './models/subscribe-star-message-submission';

type SubscribeStarSession = {
  userId: string;
  csrfToken?: string;
  uploadData?: SubscribeStarUploadData;
};

type SubscribeStarUploadData = {
  s3Url: string;
  s3UploadPath: string;
};

@WebsiteMetadata({
  name: 'subscribe-star',
  displayName: 'SubscribeStar',
})
@UserLoginFlow('https://www.subscribestar.com/login')
@SupportsUsernameShortcut({
  id: 'subscribe-star',
  url: 'https://www.subscribestar.com/$1',
})
@SupportsFiles({
  fileBatchSize: 20,
  acceptedMimeTypes: [
    'audio/aac',
    'audio/x-aac',
    'audio/mp3',
    'audio/mpeg',
    'audio/ogg',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/x-pn-wav',
    'audio/webm',
    'video/mp4',
    'video/webm',
    'video/3gpp',
    'video/x-flv',
    'video/avi',
    'video/ogg',
    'video/x-ms-wmv',
    'video/wmv',
    'video/x-matroska',
    'video/quicktime',
    'image/jpeg',
    'image/gif',
    'image/tiff',
    'image/png',
    'image/x-png',
    'image/webp',
    'application/octet-stream',
    'application/x-rar-compressed',
    'application/x-compressed',
    'application/x-rar',
    'application/vnd.rar',
    'application/x-7z-compressed',
    'application/zip',
    'application/x-zip-compressed',
    'multipart/x-zip',
    'application/x-mobipocket-ebook',
    'application/epub+zip',
    'application/epub',
    'application/vnd.ms-fontobjec',
    'text/plain',
    'text/csv',
    'application/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.template',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/html',
    'image/vnd.adobe.photoshop',
    'application/x-photoshop',
    'application/photoshop',
    'application/psd',
    'image/psd',
    'application/json',
    'application/pdf',
    'application/vnd.oasis.opendocument.text',
    'text/rtf',
  ],
  acceptedFileSizes: {
    [FileType.AUDIO]: 52428800,
    [FileType.VIDEO]: 262144000,
    [FileType.IMAGE]: 8388608,
    [FileType.TEXT]: 314572800,
  },
})
@DisableAds()
export default class SubscribeStar
  extends Website<SubscribeStarAccountData, SubscribeStarSession>
  implements
    FileWebsite<SubscribeStarFileSubmission>,
    MessageWebsite<SubscribeStarMessageSubmission>
{
  protected BASE_URL = 'https://www.subscribestar.com';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<SubscribeStarAccountData> =
    {
      tiers: true,
    };

  public async onLogin(): Promise<ILoginState> {
    const { body: profilePage } = await Http.get<string>(
      `${this.BASE_URL}/profile/settings`,
      {
        partition: this.accountId,
      },
    );

    const $ = parse(profilePage);
    const avatar = $.querySelector('.settings_media img');
    if (avatar) {
      this.sessionData.csrfToken = $.querySelector(
        'meta[name="csrf-token"]',
      ).getAttribute('content');
      this.sessionData.userId = avatar.getAttribute('data-user-id');
      this.loadTiers($);
      this.sessionData.uploadData = await this.getPostData();
      return this.loginState.setLogin(
        true,
        avatar.getAttribute('alt') || 'unknown',
      );
    }

    return this.loginState.setLogin(false, null);
  }

  private loadTiers($: HTMLElement) {
    const tiers: SelectOption[] = [];

    const tierSection = $.querySelector('.for-tier_settings');
    if (tierSection) {
      const tierItems = tierSection.querySelectorAll('.tiers-settings_item');

      tierItems.forEach((tierItem) => {
        const tierId = tierItem.getAttribute('data-id');
        const titleElement = tierItem.querySelector(
          '.tiers-settings_item-title',
        );
        const costElement = tierItem.querySelector('.tiers-settings_item-cost');

        if (tierId && titleElement && costElement) {
          const title = titleElement.textContent.trim();
          const costText = costElement.textContent.trim();

          tiers.push({
            label: `${title} (${costText})`,
            value: tierId,
          });
        }
      });
    }

    this.setWebsiteData({
      tiers,
    });
  }

  createFileModel(): SubscribeStarFileSubmission {
    return new SubscribeStarFileSubmission();
  }

  calculateImageResize(file: ISubmissionFile): ImageResizeProps {
    return undefined;
  }

  private async getPostData(): Promise<SubscribeStarUploadData | undefined> {
    try {
      const { body } = await Http.get<string>(
        `${this.BASE_URL}/${this.loginState.username}`,
        {
          partition: this.accountId,
        },
      );
      const $ = parse(body);
      const newPost = $.querySelector('.new_post')
        .querySelector('.new_post-inner')
        .getAttribute('data-form-template');
      if (newPost) {
        // Parse the JSON string first
        let decoded = JSON.parse(newPost);

        // Then decode unicode and HTML entities
        decoded = decoded.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) =>
          String.fromCharCode(parseInt(hex, 16)),
        );

        const innerDoc = parse(decoded);
        return {
          s3UploadPath: innerDoc
            .querySelector('.post_xodal')
            .getAttribute('data-s3-upload-path'),
          s3Url: innerDoc
            .querySelector('.post_xodal')
            .getAttribute('data-s3-url'),
        };
      }
    } catch (error) {
      this.logger.error(error, 'Failed to parse post data');
    }
    return undefined;
  }

  async onPostFileSubmission(
    postData: PostData<SubscribeStarFileSubmission>,
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
    postData: PostData<SubscribeStarFileSubmission>,
  ): Promise<SimpleValidationResult> {
    const validator = this.createValidator<SubscribeStarFileSubmission>();

    return validator.result;
  }

  createMessageModel(): SubscribeStarMessageSubmission {
    return new SubscribeStarMessageSubmission();
  }

  async onPostMessageSubmission(
    postData: PostData<SubscribeStarMessageSubmission>,
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
    postData: PostData<SubscribeStarMessageSubmission>,
  ): Promise<SimpleValidationResult> {
    const validator = this.createValidator<SubscribeStarMessageSubmission>();

    return validator.result;
  }
}
