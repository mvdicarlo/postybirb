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
import { CancellableToken } from '../../../post/models/cancellable-token';
import { PostingFile } from '../../../post/models/posting-file';
import FileSize from '../../../utils/filesize.util';
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
import { PatreonFileSubmission } from './models/patreon-file-submission';
import { PatreonMessageSubmission } from './models/patreon-message-submission';
import { PatreonNewPostResponse } from './models/patreon-post-types';
import { PatreonCampaignResponse } from './patreon-types';

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

  async onPostFileSubmission(
    postData: PostData<PatreonFileSubmission>,
    files: PostingFile[],
    batchIndex: number,
    cancellationToken: CancellableToken,
  ): Promise<PostResponse> {
    cancellationToken.throwIfCancelled();

    const initializedPost = await this.initializePost();

    return PostResponse.fromWebsite(this)
      .withAdditionalInfo({
        body: initializedPost,
        statusCode: initializedPost,
      })
      .withException(new Error('Failed to post'));
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
    const dataAttributes = {
      type: 'post',
      attributes: {
        comments_write_access_level: 'all',
        content: options.description ?? '<p></p>',
        is_paid: options.charge,
        is_monetized: false,
        new_post_email_type: 'preview_only',
        paywall_display: 'post_layout',
        post_type: postType,
        preview_asset_type: 'default',
        teaser_text: options.teaser,
        thumbnail_position: null,
        title: options.title,
        video_preview_start_ms: null,
        video_preview_end_ms: null,
        is_preview_blurred: true,
        allow_preview_in_rss: true,
        post_metadata: {
          platform: {},
        },
        tags: {
          publish: true,
        },
      },
      relationships: {
        // post_tag: {},
        // 'access-rule': {
        //   data: {
        //     type: 'access-rule',
        //     id: rulesSegment[0].id,
        //   },
        // },
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
          data: [],
        },
      },
    };

    return dataAttributes;
  }
}
