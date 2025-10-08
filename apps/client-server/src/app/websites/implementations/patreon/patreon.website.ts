import { SelectOption } from '@postybirb/form-builder';
import { Http } from '@postybirb/http';
import {
  DynamicObject,
  FileType,
  ILoginState,
  ImageResizeProps,
  ISubmissionFile,
  PostData,
  PostResponse,
  SimpleValidationResult,
} from '@postybirb/types';
import parse from 'node-html-parser';
import { parse as parseFileName } from 'path';
import { v4 } from 'uuid';
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import FileSize from '../../../utils/filesize.util';
import { wait } from '../../../utils/wait.util';
import { PostBuilder } from '../../commons/post-builder';
import { DisableAds } from '../../decorators/disable-ads.decorator';
import { UserLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { SupportsUsernameShortcut } from '../../decorators/supports-username-shortcut.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { MessageWebsite } from '../../models/website-modifiers/message-website';
import { Website } from '../../website';
import { PatreonAccountData } from './models/patreon-account-data';
import { PatreonCampaignResponse } from './models/patreon-campaign-types';
import { PatreonCollectionResponse } from './models/patreon-collection-types';
import { PatreonFileSubmission } from './models/patreon-file-submission';
import {
  PatreonMediaType,
  PatreonMediaUploadRequest,
  PatreonMediaUploadResponse,
} from './models/patreon-media-upload-types';
import { PatreonMessageSubmission } from './models/patreon-message-submission';
import { PatreonNewPostResponse } from './models/patreon-post-types';

type PatreonAccessRuleSegment = Array<{
  type: 'access-rule';
  id: string;
  attributes: object;
}>;

type PatreonTagSegment = Array<{
  type: 'post_tag';
  id: string;
  attributes: {
    value: string;
    cardinality: 1;
  };
}>;

@WebsiteMetadata({
  name: 'patreon',
  displayName: 'Patreon',
  minimumPostWaitInterval: 90_000,
})
@UserLoginFlow('https://www.patreon.com/login')
@SupportsFiles({
  acceptedMimeTypes: [
    'application/pdf',
    'application/rtf',
    'audio/midi',
    'audio/mp3',
    'audio/mpeg',
    'audio/oga',
    'audio/ogg',
    'audio/wav',
    'audio/x-wav',
    'image/gif',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'text/markdown',
    'text/plain',
    'video/webm',
  ],
  acceptedFileSizes: {
    '*': FileSize.megabytes(200),
  },
})
@SupportsUsernameShortcut({
  id: 'patreon',
  url: 'https://www.patreon.com/$1',
})
@DisableAds()
export default class Patreon
  extends Website<
    PatreonAccountData,
    {
      csrf: string;
      username: string;
      campaignId: string;
      campaign: PatreonCampaignResponse;
    }
  >
  implements
    FileWebsite<PatreonFileSubmission>,
    MessageWebsite<PatreonMessageSubmission>
{
  protected BASE_URL = 'https://www.patreon.com';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<PatreonAccountData> =
    {
      folders: true,
      collections: true,
    };

  public async onLogin(): Promise<ILoginState> {
    const membershipPage = await Http.get<string>(
      `${this.BASE_URL}/membership`,
      {
        partition: this.accountId,
      },
    );

    const $membershipPage = parse(membershipPage.body);
    const csrf = $membershipPage
      .querySelector('meta[name="csrf-token"]')
      ?.getAttribute('content');

    if (csrf) {
      const badgesResult = await Http.get<{
        data: Array<{
          id: string;
          type: string;
          attributes: object;
        }>;
      }>(
        `${this.BASE_URL}/api/badges?json-api-version=1.0&json-api-use-default-includes=false&include=[]`,
        {
          partition: this.accountId,
        },
      );
      const campaignBadge = badgesResult.body.data?.find((badge) =>
        badge.id.includes('campaign'),
      );
      if (campaignBadge) {
        const campaignId = campaignBadge.id.split(':')[1];
        const campaignResult = await Http.get<PatreonCampaignResponse>(
          `${this.BASE_URL}/api/campaigns/${campaignId}`,
          { partition: this.accountId },
        );

        const username = campaignResult.body.data.attributes.name;
        this.sessionData.username = username;
        this.sessionData.campaignId = campaignId;
        this.sessionData.csrf = csrf;
        this.sessionData.campaign = campaignResult.body;
        this.setWebsiteData({
          folders: this.parseTiers(campaignResult.body),
          collections: await this.loadCollections(campaignId),
        });
        return this.loginState.setLogin(true, username);
      }
    }

    return this.loginState.setLogin(false, null);
  }

  private parseTiers(campaign: PatreonCampaignResponse): SelectOption[] {
    const { included } = campaign;
    if (!included) return [];
    const rewards = included.filter((item) => item.type === 'reward');
    return rewards.map((reward) => ({
      label: `${
        reward.attributes.title ||
        reward.attributes.description ||
        'Untitled Reward'
      }${reward.attributes.amount_cents ? ` - $${(reward.attributes.amount_cents / 100).toFixed(2)}` : ''}`,
      value: reward.id,
    }));
  }

  private async loadCollections(campaignId: string): Promise<SelectOption[]> {
    const collectionRes = await Http.get<PatreonCollectionResponse>(
      `${this.BASE_URL}/api/collection?filter[campaign_id]=${campaignId}&filter[must_contain_at_least_one_published_post]=false&json-api-version=1.0&json-api-use-default-includes=false`,
      {
        partition: this.accountId,
        headers: {
          'X-Csrf-Signature': this.sessionData.csrf,
        },
      },
    );

    if (
      collectionRes.statusCode >= 400 &&
      typeof collectionRes.body === 'string' // Failure returns html
    ) {
      return [];
    }
    try {
      const collections: SelectOption[] = collectionRes.body.data.map((c) => ({
        label: c.attributes.title,
        value: c.id,
      }));
      return collections;
    } catch (err) {
      this.logger.error(err);
      return [];
    }
  }

  private getPostType(fileType: FileType): string {
    switch (fileType) {
      case FileType.AUDIO:
        return 'audio_embed';
      case FileType.IMAGE:
        return 'image_file';
      case FileType.VIDEO:
        return 'video';
      case FileType.TEXT:
      default:
        return 'text_only';
    }
  }

  createFileModel(): PatreonFileSubmission {
    return new PatreonFileSubmission();
  }

  calculateImageResize(file: ISubmissionFile): ImageResizeProps {
    return undefined;
  }

  private async initializePost() {
    const res = await Http.post<PatreonNewPostResponse>(
      `${this.BASE_URL}/api/posts?fields[post]=post_type%2Cpost_metadata&include=drop&json-api-version=1.0&json-api-use-default-includes=false`,
      {
        partition: this.accountId,
        type: 'json',
        data: {
          data: {
            type: 'post',
            attributes: {
              post_type: 'text_only',
            },
          },
        },
        headers: {
          'X-Csrf-Signature': this.sessionData.csrf,
        },
      },
    );

    PostResponse.validateBody(this, res);
    return res.body;
  }

  private async finalizePost(
    postUrl: string,
    data: DynamicObject,
  ): Promise<void> {
    const res = await Http.patch(
      `${postUrl}?json-api-version=1.0&json-api-use-default-includes=false&include=[]`,
      {
        partition: this.accountId,
        type: 'json',
        data,
        headers: {
          'X-Csrf-Signature': this.sessionData.csrf,
        },
      },
    );

    PostResponse.validateBody(this, res);
  }

  private getMediaType(fileType: FileType): PatreonMediaType | undefined {
    switch (fileType) {
      case FileType.AUDIO:
        return 'audio';
      case FileType.IMAGE:
        return 'image';
      case FileType.VIDEO:
        return 'video';
      default:
        return undefined;
    }
  }

  private async uploadMedia(
    postId: string,
    file: PostingFile,
    asAttachment: boolean,
    cancellationToken: CancellableToken,
  ): Promise<PatreonMediaUploadResponse> {
    const { ext } = parseFileName(file.fileName);
    const fileNameGUID = `${v4().toUpperCase()}${ext}`;
    if (file.fileType === FileType.TEXT || file.fileType === FileType.UNKNOWN) {
      // eslint-disable-next-line no-param-reassign
      asAttachment = true;
    }
    const req: PatreonMediaUploadRequest = {
      data: {
        type: 'media',
        attributes: {
          state: 'pending_upload',
          file_name: fileNameGUID,
          size_bytes: file.buffer.length,
          owner_id: postId,
          owner_type: 'post',
          owner_relationship: asAttachment ? 'attachment' : 'main',
          media_type: asAttachment
            ? undefined
            : this.getMediaType(file.fileType),
        },
      },
    };

    const init = await Http.post<PatreonMediaUploadResponse>(
      `${this.BASE_URL}/api/media?json-api-version=1.0&json-api-use-default-includes=false&include=%5B%5D`,
      {
        partition: this.accountId,
        type: 'json',
        data: req,
        headers: {
          'X-Csrf-Signature': this.sessionData.csrf,
        },
      },
    );

    PostResponse.validateBody(this, init, 'Media Upload Initial Stage');

    // eslint-disable-next-line no-param-reassign
    file.fileName = fileNameGUID;
    const builder = new PostBuilder(this, cancellationToken)
      .asMultipart()
      .withData(init.body.data.attributes.upload_parameters)
      .addFile('file', file);

    const upload = await builder.send(init.body.data.attributes.upload_url);
    PostResponse.validateBody(this, upload, 'Bucket Upload');

    const timeout = Date.now() + 90_000;
    while (Date.now() <= timeout) {
      const state = await Http.get<PatreonMediaUploadResponse>(
        `${this.BASE_URL}/api/media/${init.body.data.id}?json-api-version=1.0&json-api-use-default-includes=false&include=[]`,
        {
          partition: this.accountId,
          headers: {
            'X-Csrf-Signature': this.sessionData.csrf,
          },
        },
      );

      PostResponse.validateBody(this, state, 'Verify Upload State');

      if (state.body.data.attributes.state === 'ready') {
        return state.body;
      }

      if (state.body.data.attributes.state === 'failed') {
        // eslint-disable-next-line @typescript-eslint/no-throw-literal
        throw PostResponse.fromWebsite(this)
          .withException(new Error('Media upload failed'))
          .withAdditionalInfo(state)
          .atStage('Verify Upload State Failed');
      }
      await wait(2000);
    }

    throw new Error('Unable to verify media upload state');
  }

  async onPostFileSubmission(
    postData: PostData<PatreonFileSubmission>,
    files: PostingFile[],
    batchIndex: number,
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    cancellationToken.throwIfCancelled();
    const initializedPost = await this.initializePost();

    const uploadedFiles = await Promise.all(
      files.map((f) =>
        this.uploadMedia(
          initializedPost.data.id,
          f,
          postData.options.allAsAttachment,
          cancellationToken,
        ),
      ),
    );

    throw new Error('Fake Error');

    const tags = this.createTagsSegment(postData.options.tags || []);
    const accessTiers = this.createAccessRuleSegment(
      postData.options.tiers || [],
    );

    const postAttributes = {
      data: this.createDataSegment(postData, tags, accessTiers, 'text_only'),
      meta: this.createDefaultMetadataSegment(),
      included: [...tags, ...accessTiers],
    };

    cancellationToken.throwIfCancelled();
    await this.finalizePost(initializedPost.links.self, postAttributes);

    return PostResponse.fromWebsite(this)
      .withAdditionalInfo({
        postAttributes,
      })
      .withSourceUrl(`${this.BASE_URL}/posts/${initializedPost.data.id}`);
  }

  async onValidateFileSubmission(
    postData: PostData<PatreonFileSubmission>,
  ): Promise<SimpleValidationResult> {
    const validator = this.createValidator<PatreonFileSubmission>();

    return validator.result;
  }

  createMessageModel(): PatreonMessageSubmission {
    return new PatreonMessageSubmission();
  }

  async onPostMessageSubmission(
    postData: PostData<PatreonMessageSubmission>,
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    cancellationToken.throwIfCancelled();
    const initializedPost = await this.initializePost();

    const tags = this.createTagsSegment(postData.options.tags || []);
    const accessTiers = this.createAccessRuleSegment(
      postData.options.tiers || [],
    );

    const postAttributes = {
      data: this.createDataSegment(postData, tags, accessTiers, 'text_only'),
      meta: this.createDefaultMetadataSegment(),
      included: [...tags, ...accessTiers],
    };

    cancellationToken.throwIfCancelled();
    await this.finalizePost(initializedPost.links.self, postAttributes);

    return PostResponse.fromWebsite(this)
      .withAdditionalInfo({
        postAttributes,
      })
      .withSourceUrl(`${this.BASE_URL}/posts/${initializedPost.data.id}`);
  }

  async onValidateMessageSubmission(
    postData: PostData<PatreonMessageSubmission>,
  ): Promise<SimpleValidationResult> {
    const validator = this.createValidator<PatreonMessageSubmission>();
    // TODO - Validation for charge and schedule conflict
    // TODO - Validation for Access Tier conflicts (everyone/free + paid option)
    return validator.result;
  }

  private createTagsSegment(tags: string[]): PatreonTagSegment {
    return tags.slice(0, 50).map((tag) => ({
      type: 'post_tag',
      id: `user_defined;${tag}`,
      attributes: {
        value: tag,
        cardinality: 1,
      },
    }));
  }

  private createAccessRuleSegment(
    patreonTiers: string[],
  ): PatreonAccessRuleSegment {
    return patreonTiers.map((tier) => ({
      type: 'access-rule',
      id: `user_defined;${tier}`,
      attributes: {},
    }));
  }

  private createDefaultMetadataSegment() {
    return {
      auto_save: true,
      send_notifications: true,
    };
  }

  private createDataSegment(
    postData:
      | PostData<PatreonMessageSubmission>
      | PostData<PatreonFileSubmission>,
    tagSegment: PatreonTagSegment,
    rulesSegment: PatreonAccessRuleSegment,
    postType: string,
  ) {
    const { options } = postData;
    const {
      description,
      teaser,
      title,
      charge,
      schedule,
      earlyAccess,
      collections,
    } = options;
    const dataAttributes = {
      type: 'post',
      attributes: {
        comments_write_access_level: 'all',
        content: description ?? '<p></p>',
        is_paid: charge,
        is_monetized: false,
        new_post_email_type: 'preview_only',
        paywall_display: 'post_layout',
        post_type: postType,
        preview_asset_type: 'default',
        teaser_text: teaser,
        thumbnail_position: null,
        title,
        video_preview_start_ms: null,
        video_preview_end_ms: null,
        is_preview_blurred: true,
        allow_preview_in_rss: true,
        scheduled_for: schedule ?? undefined,
        change_visibility_at: earlyAccess ?? undefined,
        post_metadata: {
          platform: {},
        },
        tags: {
          publish: true,
        },
      },
      relationships: {
        user_defined_tags: {
          data: tagSegment.map((tag) => ({
            id: tag.id,
            type: 'post_tag',
          })),
        },
        access_rules: {
          data: rulesSegment.map((rule) => ({
            id: rule.id,
            type: 'access-rule',
          })),
        },
        collections: {
          data: collections ?? [],
        },
      },
    };

    return dataAttributes;
  }
}
