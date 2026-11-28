import {
  ImageResizeProps,
  IPostResponse,
  LoginResult,
  OAuthRouteHandlers,
  PostData,
  PostResponse,
  SimpleValidationResult,
  YiffPartyAccountData,
  YiffPartyOAuthRoutes,
} from '@postybirb/types';
import { CancellationToken } from '../../../posting/cancellation-token';
import { PostingFile } from '../../../posting/models/posting-file';
import { PostBuilder } from '../../commons/post-builder';
import { CustomLoginFlow } from '../../decorators/login-flow.decorator';
import { SupportsFiles } from '../../decorators/supports-files.decorator';
import { WebsiteMetadata } from '../../decorators/website-metadata.decorator';
import { DataPropertyAccessibility } from '../../models/data-property-accessibility';
import { FileWebsite } from '../../models/website-modifiers/file-website';
import { OAuthWebsite } from '../../models/website-modifiers/oauth-website';
import { Website } from '../../website';
import { YiffPartyFileSubmission } from './models/yiff-party-file-submission';

interface YiffPartyError {
  error?: string;
  code?: string;
  existing?: { id: string | number; url: string } | null;
}

interface YiffPartyMe {
  artist: { name: string; tagSlug: string };
  tag: { slug: string; name: string; url: string };
  uploadsPending: number;
  limits: {
    perHour: number;
    perDay: number;
    minTags: number;
    maxFileBytes: number;
    minWidth: number;
    minHeight: number;
    fileTypes: string[];
  };
}

interface YiffPartyUploadResult extends YiffPartyError {
  id?: string | number;
  status?: string;
  url?: string;
}

type YiffPartyFormData = Parameters<PostBuilder['withData']>[0];

const MIN_TAGS = 5;
const MIN_WIDTH = 500;
const MIN_HEIGHT = 500;

// Tag prefixes Yiff Party accepts; anything else is a general tag.
const ARTIST_PREFIX = 'artist:';

@WebsiteMetadata({ name: 'yiff-party', displayName: 'Yiff Party' })
@CustomLoginFlow()
@SupportsFiles({
  acceptedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
  acceptedFileSizes: { '*': 25 * 1024 * 1024 },
  acceptsExternalSourceUrls: true,
  // One image per post.
  fileBatchSize: 1,
})
export default class YiffParty
  extends Website<YiffPartyAccountData>
  implements
    FileWebsite<YiffPartyFileSubmission>,
    OAuthWebsite<YiffPartyOAuthRoutes>
{
  protected BASE_URL = 'https://yiff-party.com';

  public externallyAccessibleWebsiteDataProperties: DataPropertyAccessibility<YiffPartyAccountData> =
    { apiKey: false, artistName: true, tagSlug: true, minTags: true };

  private getHeaders(apiKey: string) {
    return {
      Authorization: `Bearer ${apiKey}`,
      // The host challenges browser user agents, so identify as PostyBirb.
      'User-Agent': `PostyBirb/${this.platform.app.getVersion()}`,
      Accept: 'application/json',
    };
  }

  private async fetchMe(apiKey: string): Promise<YiffPartyMe | undefined> {
    const response = await this.platform.http.get<YiffPartyMe>(
      `${this.BASE_URL}/api/v1/me/`,
      { partition: this.accountId, headers: this.getHeaders(apiKey) },
    );
    if (response.statusCode !== 200 || !response.body?.artist) {
      return undefined;
    }
    return response.body;
  }

  private async saveAccountData(me: YiffPartyMe, apiKey: string) {
    await this.setWebsiteData({
      apiKey,
      artistName: me.artist.name,
      tagSlug: me.artist.tagSlug,
      minTags: me.limits?.minTags ?? MIN_TAGS,
    });
  }

  public async onLogin(): Promise<LoginResult> {
    const { apiKey } = this.websiteDataStore.getData();
    if (!apiKey) return { loggedIn: false };

    try {
      const me = await this.fetchMe(apiKey);
      if (!me) return { loggedIn: false };
      await this.saveAccountData(me, apiKey);
      return { loggedIn: true, username: me.artist.name };
    } catch (error) {
      this.logger.withError(error).error('Failed to log in to Yiff Party');
      return { loggedIn: false };
    }
  }

  onAuthRoute: OAuthRouteHandlers<YiffPartyOAuthRoutes> = {
    login: async ({ apiKey }) => {
      const key = apiKey?.trim();
      if (!key) return { result: false };

      try {
        const me = await this.fetchMe(key);
        if (!me) return { result: false };
        await this.saveAccountData(me, key);
        const state = await this.login();
        return { result: state.isLoggedIn };
      } catch (error) {
        this.logger.withError(error).error('Yiff Party login failed');
        return { result: false };
      }
    },
  };

  createFileModel(): YiffPartyFileSubmission {
    return new YiffPartyFileSubmission();
  }

  calculateImageResize(): ImageResizeProps | undefined {
    return undefined;
  }

  private getFields(
    options: PostData<YiffPartyFileSubmission>['options'],
    file: PostingFile,
  ): YiffPartyFormData {
    const fields: YiffPartyFormData = {
      title: options.title ?? '',
      description: options.description ?? '',
      tags: options.tags.join(','),
      rating: options.rating,
    };
    (file.metadata?.sourceUrls ?? [])
      .filter((url) => !!url)
      .slice(0, 10)
      .forEach((url, index) => {
        fields[`sourceUrls[${index}]`] = url;
      });
    if (file.metadata?.altText) {
      fields['altText[0]'] = file.metadata.altText;
    }
    return fields;
  }

  private errorMessage(statusCode: number, body?: YiffPartyError): string {
    if (statusCode === 409 && body?.existing?.url) {
      return `${body.error || 'Already on Yiff Party'}: ${body.existing.url}`;
    }
    if (statusCode === 429 || statusCode === 503) {
      return body?.error || 'Yiff Party upload limit reached, try again later';
    }
    return body?.error || `Yiff Party upload failed with status ${statusCode}`;
  }

  async onPostFileSubmission(
    postData: PostData<YiffPartyFileSubmission>,
    files: PostingFile[],
    cancellationToken: CancellationToken,
  ): Promise<IPostResponse> {
    const result = PostResponse.fromWebsite(this);
    const { apiKey } = this.websiteDataStore.getData();
    if (!apiKey) {
      return result.withException(new Error('Not logged in to Yiff Party'));
    }

    const file = files[0];
    cancellationToken.throwIfAborted();
    const response = await this.platform.http.post<YiffPartyUploadResult>(
      `${this.BASE_URL}/api/v1/uploads/`,
      {
        partition: this.accountId,
        type: 'multipart',
        headers: this.getHeaders(apiKey),
        data: new PostBuilder(this, cancellationToken)
          .asMultipart()
          .withData(this.getFields(postData.options, file))
          .addFile('file', file)
          .build(),
      },
    );

    if (response.statusCode !== 200 || !response.body?.id) {
      return result
        .withAdditionalInfo({
          statusCode: response.statusCode,
          body: response.body,
        })
        .withException(
          new Error(this.errorMessage(response.statusCode, response.body)),
        );
    }
    return result
      .withSourceUrl(response.body.url)
      .withMessage('Sent to Yiff Party, waiting for review');
  }

  async onValidateFileSubmission(
    postData: PostData<YiffPartyFileSubmission>,
  ): Promise<SimpleValidationResult<YiffPartyFileSubmission>> {
    const validator = this.createValidator<YiffPartyFileSubmission>();
    const { apiKey, minTags } = this.websiteDataStore.getData();
    const tags = postData.options.tags ?? [];

    if (!apiKey) {
      validator.error('validation.file.yiff-party.not-logged-in', {});
    }

    const required = Math.max(minTags ?? MIN_TAGS, MIN_TAGS);
    if (tags.length < required) {
      validator.error(
        'validation.tags.min-tags',
        { currentLength: tags.length, minLength: required },
        'tags',
      );
    }

    const artistTags = tags.filter((tag) =>
      tag.toLowerCase().startsWith(ARTIST_PREFIX),
    );
    if (artistTags.length > 0) {
      validator.error(
        'validation.tags.yiff-party.artist-tag',
        { tags: artistTags },
        'tags',
      );
    }

    const files = (postData.submission?.files ?? []).filter(
      (file) => !file.metadata?.ignoredWebsites?.includes(this.accountId),
    );
    for (const file of files) {
      if (
        file.width &&
        file.height &&
        (file.width < MIN_WIDTH || file.height < MIN_HEIGHT)
      ) {
        validator.error('validation.file.yiff-party.min-dimensions', {
          fileName: file.fileName,
          minWidth: MIN_WIDTH,
          minHeight: MIN_HEIGHT,
        });
      }
    }

    return validator.result;
  }
}
