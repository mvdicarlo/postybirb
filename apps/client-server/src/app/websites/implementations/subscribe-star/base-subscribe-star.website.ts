import { SelectOption } from '@postybirb/form-builder';
import { Http } from '@postybirb/http';
import {
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
import { PostBuilder } from '../../commons/post-builder';
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
};

type SubscribeStarUploadData = {
  s3Url: string;
  s3UploadPath: string;
  authenticityToken: string;
};

type SubscribeStarPostResponse = {
  error: unknown;
  html: string;
  notice: string;
  page_title: unknown;
  push_state: boolean;
  return: boolean;
};

type SubscribeStarUploadItem = {
  id: number;
  original_filename: string;
  remove_path: string;
  pinned: boolean;
  group: string;
  created_at: string;
  gallery_preview_url?: string;
  preview_url?: string;
  url: string;
  width?: string;
  height?: string;
  type: string;
};

type SubscribeStarProcessFileResponse = {
  imgs_and_videos: SubscribeStarUploadItem[];
  audios: SubscribeStarUploadItem[];
  docs: SubscribeStarUploadItem[];
  processed: boolean;
};

export default abstract class BaseSubscribeStar
  extends Website<SubscribeStarAccountData, SubscribeStarSession>
  implements
    FileWebsite<SubscribeStarFileSubmission>,
    MessageWebsite<SubscribeStarMessageSubmission>
{
  protected abstract BASE_URL: string;

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
    const topBar = $.querySelector('.top_bar-user_info');
    if (topBar) {
      const username = topBar.innerText.trim();
      this.sessionData.csrfToken = $.querySelector(
        'meta[name="csrf-token"]',
      ).getAttribute('content');
      this.sessionData.userId = topBar
        .querySelector('img')
        .getAttribute('data-user-id');
      this.loadTiers($);
      return this.loginState.setLogin(true, username || 'unknown');
    }

    return this.loginState.setLogin(false, null);
  }

  private loadTiers($: HTMLElement) {
    const tiers: SelectOption[] = [
      {
        label: 'Public',
        value: 'free',
        mutuallyExclusive: true,
      },
    ];

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
          authenticityToken: parse(
            innerDoc
              .querySelectorAll('form input')
              .find((input) => input.rawAttrs.includes('authenticity_token'))
              .outerHTML,
          ).children[0].getAttribute('value'),
        };
      }
    } catch (error) {
      this.logger.error(error, 'Failed to parse post data');
    }
    return undefined;
  }

  private async uploadFile(
    file: PostingFile,
    uploadData: SubscribeStarUploadData,
  ): Promise<string | undefined> {
    const bucket = uploadData.s3Url.split('//')[1].split('.')[0];

    // Build the S3 key using the existing GUID filename
    const key = `${uploadData.s3UploadPath}/${file.fileName}`;

    // Get presigned URL for upload
    const presignUrl = `${
      this.BASE_URL
    }/presigned_url/upload?_=${Date.now()}&key=${encodeURIComponent(
      key,
    )}&file_name=${encodeURIComponent(file.fileName)}&content_type=${encodeURIComponent(
      file.mimeType,
    )}&bucket=${bucket}`;

    const presign = await Http.get<{ url: string; fields?: object }>(
      presignUrl,
      {
        partition: this.accountId,
      },
    );

    // Upload file to S3
    const postFile = await Http.post<string>(presign.body.url, {
      partition: this.accountId,
      type: 'multipart',
      data: {
        ...presign.body.fields,
        file: file.toPostFormat(),
        authenticity_token: uploadData.authenticityToken,
      },
      headers: {
        Referer: `${this.BASE_URL}/`,
        Origin: this.BASE_URL,
      },
    });

    if (postFile.statusCode !== 204 && postFile.statusCode !== 200) {
      throw new Error(`Failed to upload file: ${postFile.statusCode}`);
    }

    // Build the record for processing
    const record: Record<string, unknown> = {
      path: key,
      url: `${presign.body.url}/${key}`,
      original_filename: file.fileName,
      content_type: file.mimeType,
      bucket,
      authenticity_token: uploadData.authenticityToken,
    };

    // Add dimensions for images using pre-acquired width/height from PostingFile
    if (
      record.content_type.toString().includes('image') &&
      file.width &&
      file.height
    ) {
      record.width = file.width;
      record.height = file.height;
    }

    // Process the S3 attachment
    const processFile = await Http.post<SubscribeStarProcessFileResponse>(
      `${this.BASE_URL}/post_uploads/process_s3_attachments.json`,
      {
        partition: this.accountId,
        type: 'multipart',
        data: record,
        headers: {
          'X-CSRF-Token': this.sessionData.csrfToken,
        },
      },
    );

    if (processFile.statusCode !== 200) {
      throw new Error(`Failed to process file: ${processFile.statusCode}`);
    }

    // Extract the ID by matching the original filename
    const allUploads = [
      ...processFile.body.imgs_and_videos,
      ...processFile.body.audios,
      ...processFile.body.docs,
    ];

    // Find the uploaded item by matching the original filename
    const uploadedItem = allUploads.find(
      (item) => item.original_filename === file.fileName,
    );

    return uploadedItem ? String(uploadedItem.id) : undefined;
  }

  async onPostFileSubmission(
    postData: PostData<SubscribeStarFileSubmission>,
    files: PostingFile[],
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    const uploadData = await this.getPostData();

    const uploadedFileIds: string[] = [];
    for (const file of files) {
      const fileId = await this.uploadFile(file, uploadData);
      if (fileId) {
        uploadedFileIds.push(fileId);
      }
    }

    // Reorder files if there are multiple uploads
    if (uploadedFileIds.length > 1) {
      await Http.post(`${this.BASE_URL}/post_uploads/reorder`, {
        partition: this.accountId,
        type: 'multipart',
        data: {
          'upload_ids[]': uploadedFileIds,
        },
        headers: {
          'X-CSRF-Token': this.sessionData.csrfToken,
        },
      });
    }

    const builder = new PostBuilder(this, cancellationToken)
      .asUrlEncoded(true)
      .withHeader('X-Csrf-Token', this.sessionData.csrfToken)
      .withHeader('Referrer', `${this.BASE_URL}/${this.loginState.username}`)
      .setField('authenticity_token', uploadData.authenticityToken)
      .setField('html_content', `<div>${postData.options.description}</div>`)
      .setField('pinned_uploads', '[]')
      .setField('new_editor', true)
      .setField('is_draft', '')
      .setField('tags', postData.options.tags)
      .setField('has_poll', false)
      .setField('poll_options', [])
      .setField('finish_date', '')
      .setField('finish_time', '')
      .setField(
        'tier_ids',
        postData.options.tiers.filter((tier) => tier !== 'free'),
      )
      .setField('posting_option', 'Publish Now');

    const post = await builder.send<SubscribeStarPostResponse>(
      `${this.BASE_URL}/posts.json`,
    );

    if (post.body.error) {
      return PostResponse.fromWebsite(this)
        .withAdditionalInfo({
          body: post.body,
          statusCode: post.statusCode,
        })
        .withException(new Error('Failed to post'));
    }

    const $ = parse(post.body.html);
    const postId = $.querySelector('.post').getAttribute('data-id');
    return PostResponse.fromWebsite(this)
      .withAdditionalInfo(post.body)
      .withSourceUrl(`${this.BASE_URL}/posts/${postId}`);
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
    const uploadData = await this.getPostData();
    const builder = new PostBuilder(this, cancellationToken)
      .asUrlEncoded(true)
      .withHeader('X-Csrf-Token', this.sessionData.csrfToken)
      .withHeader('Referrer', `${this.BASE_URL}/${this.loginState.username}`)
      .setField('authenticity_token', uploadData.authenticityToken)
      .setField('html_content', `<div>${postData.options.description}</div>`)
      .setField('pinned_uploads', '[]')
      .setField('new_editor', true)
      .setField('is_draft', '')
      .setField('tags', postData.options.tags)
      .setField('has_poll', false)
      .setField('poll_options', [])
      .setField('finish_date', '')
      .setField('finish_time', '')
      .setField(
        'tier_ids',
        postData.options.tiers.filter((tier) => tier !== 'free'),
      )
      .setField('posting_option', 'Publish Now');

    const post = await builder.send<SubscribeStarPostResponse>(
      `${this.BASE_URL}/posts.json`,
    );

    if (post.body.error) {
      return PostResponse.fromWebsite(this)
        .withAdditionalInfo({
          body: post.body,
          statusCode: post.statusCode,
        })
        .withException(new Error('Failed to post'));
    }

    const $ = parse(post.body.html);
    const postId = $.querySelector('.post').getAttribute('data-id');
    return PostResponse.fromWebsite(this)
      .withAdditionalInfo(post.body)
      .withSourceUrl(`${this.BASE_URL}/posts/${postId}`);
  }

  async onValidateMessageSubmission(
    postData: PostData<SubscribeStarMessageSubmission>,
  ): Promise<SimpleValidationResult> {
    const validator = this.createValidator<SubscribeStarMessageSubmission>();

    return validator.result;
  }
}
