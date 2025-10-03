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
import { PatreonCampaignResponse } from './patreon-types';

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

  createFileModel(): PatreonFileSubmission {
    return new PatreonFileSubmission();
  }

  calculateImageResize(file: ISubmissionFile): ImageResizeProps {
    return undefined;
  }

  async onPostFileSubmission(
    postData: PostData<PatreonFileSubmission>,
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
    postData: PostData<PatreonMessageSubmission>,
  ): Promise<SimpleValidationResult> {
    const validator = this.createValidator<PatreonMessageSubmission>();

    return validator.result;
  }
}
